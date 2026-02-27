import type { ColumnType, TableType, UITypes } from 'nocodb-sdk'
import { SmartsheetStoreEvents } from '#imports'

export interface AIEnrichmentConfig {
    prompt: string
    outputColumns: Array<{ name: string; type: UITypes }>
    runOption?: '1' | '10' | 'all' | 'none'
}

export interface UseAIEnrichmentOptions {
    meta: Ref<TableType | undefined>
    view?: Ref<{ id?: string } | undefined>
    column?: Ref<ColumnType | undefined>
    eventBus?: ReturnType<typeof useSmartsheetStoreOrThrow>['eventBus']
    getMeta?: (baseId: string, tableId: string, force?: boolean) => Promise<void>
    loadViewColumns?: () => Promise<void>
    onSuccess?: () => void
    onError?: (error: any) => void
}

export function useAIEnrichment(options: UseAIEnrichmentOptions) {
    const { meta, view, column, eventBus, getMeta, loadViewColumns, onSuccess, onError } = options
    const { $api } = useNuxtApp()
    const { t } = useI18n()

    /**
     * Extracts column IDs referenced in prompt using {columnName} syntax
     * @param prompt - Prompt text with {columnName} placeholders
     * @param columns - Available columns in the table
     * @returns Array of column IDs that are referenced
     */
    function extractReferenceColumnIds(
        prompt: string,
        columns: ColumnType[],
    ): string[] {
        if (!prompt || !columns) return []

        const regex = /{([^}]+)}/g
        const matches: string[] = []
        let match

        while ((match = regex.exec(prompt)) !== null) {
            const columnName = match[1].trim()
            // Find column by title (case-insensitive)
            const column = columns.find(
                (col) => col.title?.toLowerCase() === columnName.toLowerCase(),
            )
            if (column?.id) {
                matches.push(column.id)
            }
        }

        // Remove duplicates
        return [...new Set(matches)]
    }

    /**
     * Creates AI metadata structure for a column
     */
    const createAIMetadata = (
        prompt: string,
        existingMeta?: any,
        referenceColumnIds?: string[],
    ) => {
        return {
            isAIField: true,
            prompt: {
                prompt_text: prompt,
                references: referenceColumnIds || existingMeta?.prompt?.references || [],
                created_at: existingMeta?.prompt?.created_at || new Date().toISOString(),
                created_by: existingMeta?.prompt?.created_by || null,
                ...(existingMeta?.prompt?.created_at ? {} : { updated_at: new Date().toISOString() }),
            },
        }
    }

    /**
     * Creates new AI columns
     */
    const createAIColumns = async (config: AIEnrichmentConfig) => {
        if (!meta.value?.id || !meta.value?.base_id || !(meta.value as any)?.fk_workspace_id) {
            throw new Error('Table metadata not available')
        }

        const currIndex = meta.value?.columns?.length ?? 0

        // Extract reference column IDs from prompt
        const referenceColumnIds = extractReferenceColumnIds(
            config.prompt,
            meta.value?.columns || [],
        )

        // Build bulk operations for adding columns
        const bulkOpsCols = config.outputColumns.map((col, index) => ({
            op: 'add' as const,
            column: {
                title: col.name,
                column_name: col.name,
                uidt: col.type,
                table_name: meta.value?.table_name,
                view_id: view?.value?.id,
                order: currIndex + index,
                column_order: {
                    order: currIndex + index,
                    view_id: view?.value?.id,
                },
                meta: createAIMetadata(config.prompt, undefined, referenceColumnIds),
            },
        }))

        // Add columns via bulk operation
        await $api.internal.postOperation(
            (meta.value as any).fk_workspace_id,
            meta.value.base_id,
            { operation: 'columnsBulk', tableId: meta.value.id },
            {
                hash: meta.value?.columnsHash,
                ops: bulkOpsCols,
            },
        )

        // Refresh table metadata to show new columns
        if (getMeta) {
            await getMeta(meta.value.base_id, meta.value.id, true)
        }

        // Reload view columns
        if (loadViewColumns) {
            await loadViewColumns()
        }

        return {
            success: true,
            message: `${config.outputColumns.length} column(s) added successfully`,
        }
    }

    /**
     * Updates an existing AI column
     */
    const updateAIColumn = async (config: AIEnrichmentConfig) => {
        if (!meta.value?.id || !meta.value?.base_id || !(meta.value as any)?.fk_workspace_id || !column?.value?.id) {
            throw new Error('Table metadata or column not available')
        }

        // Extract reference column IDs from prompt
        const referenceColumnIds = extractReferenceColumnIds(
            config.prompt,
            meta.value?.columns || [],
        )

        // Update the existing column's metadata
        const currentMeta = parseProp(column!.value.meta || {})
        const updatedMeta = {
            ...currentMeta,
            ...createAIMetadata(config.prompt, currentMeta, referenceColumnIds),
        }

        // Prepare update payload with meta, title, and uidt
        const updatePayload: any = { meta: updatedMeta }

        // Include title and uidt from outputColumns if provided (for editing column name/type)
        if (config.outputColumns && config.outputColumns.length > 0) {
            const newColumnName = config.outputColumns[0].name
            const newColumnType = config.outputColumns[0].type

            if (newColumnName) {
                updatePayload.title = newColumnName
            }
            if (newColumnType) {
                updatePayload.uidt = newColumnType
            }
        }

        // Update the column via API
        await $api.internal.postOperation(
            (meta.value as any).fk_workspace_id,
            meta.value.base_id,
            {
                operation: 'columnUpdate',
                columnId: column!.value.id,
            },
            updatePayload,
        )

        // Refresh table metadata
        if (getMeta) {
            await getMeta(meta.value.base_id, meta.value.id, true)
        }

        // Emit field reload event
        if (eventBus) {
            eventBus.emit(SmartsheetStoreEvents.FIELD_RELOAD)
        }

        return {
            success: true,
            message: t('msg.success.columnUpdated') || 'Field updated successfully',
        }
    }

    /**
     * Main save handler that routes to create or update based on context
     */
    const handleSave = async (config: AIEnrichmentConfig) => {
        try {
            let result

            // If column exists, update it; otherwise create new columns
            if (column?.value?.id) {
                result = await updateAIColumn(config)
            } else {
                result = await createAIColumns(config)
            }

            message.success(result.message)

            // TODO: If runOption is not 'none', trigger AI enrichment job here
            if (config.runOption && config.runOption !== 'none') {
                console.log('AI enrichment will run on:', config.runOption, 'rows with prompt:', config.prompt)
                // Future: Call AI enrichment API here
            }

            if (onSuccess) {
                onSuccess()
            }

            return result
        } catch (e: any) {
            console.error(e)
            const errorMsg = await extractSdkResponseErrorMsg(e)
            message.error(errorMsg || 'Operation failed')

            if (onError) {
                onError(e)
            }

            throw e
        }
    }

    return {
        handleSave,
        createAIColumns,
        updateAIColumn,
        createAIMetadata,
    }
}
