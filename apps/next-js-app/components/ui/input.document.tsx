"use client"

import React from "react"

// Custom Hooks
import {
  formatBytes,
  useFileUpload,
} from "@/lib/hooks/useFileUpload"

// Lucide Icons
import {
  AlertCircleIcon,
  FileUpIcon,
} from "lucide-react"

interface InputDocumentProps {
  accept?: string[]
  onUpload?: (file: File) => Promise<any>
}

export function InputDocument({ accept = ["*"], onUpload }: InputDocumentProps) {
  const maxSize = 100 * 1024 * 1024 // 100MB
  const maxFiles = 10

  const [uploadingFiles, setUploadingFiles] = React.useState<Set<string>>(new Set())
  const [uploadedFiles, setUploadedFiles] = React.useState<Set<string>>(new Set())

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: true,
    maxFiles,
    maxSize,
    initialFiles: [],
    accept: accept.join(","),
    onFilesAdded: (addedFiles) => {
      // Automatically upload new files if onUpload is provided
      if (onUpload) {
        addedFiles.forEach(fileItem => {
          handleUpload(fileItem)
        })
      }
    }
  })

  const handleUpload = async (fileItem: any) => {
    if (!onUpload) return

    setUploadingFiles(prev => new Set(prev).add(fileItem.id))

    try {
      await onUpload(fileItem.file)
      setUploadedFiles(prev => new Set(prev).add(fileItem.id))
      // Remove the file from the list after successful upload with a small delay
      setTimeout(() => {
        removeFile(fileItem.id)
        setUploadingFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(fileItem.id)
          return newSet
        })
        setUploadedFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(fileItem.id)
          return newSet
        })
      }, 1500)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileItem.id)
        return newSet
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        onClick={openFileDialog}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 transition-colors has-disabled:pointer-events-none has-disabled:opacity-50 has-[input:focus]:ring-[3px]"
      >
        <input
          {...getInputProps({ accept: accept.join(",") })}
          className="sr-only"
          aria-label="Upload files"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <FileUpIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 text-sm font-medium">
            Upload documents
          </p>
          <p className="text-muted-foreground mb-2 text-xs">
            Drag and drop or click to browse
          </p>
          <div className="text-muted-foreground/70 flex flex-wrap justify-center gap-1 text-xs">
            <span>PDFs only</span>
            <span>∙</span>
            <span>Up to {formatBytes(maxSize)}</span>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  )
}
