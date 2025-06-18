"use client"

import {
  AlertCircleIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileUpIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
  XIcon,
  CheckCircleIcon,
  LoaderIcon,
} from "lucide-react"

import {
  formatBytes,
  useFileUpload,
} from "@/lib/hooks/useFileUpload"
import { Button } from "@/components/ui/button"
import React from "react"
import { useDocuments } from "@/app/dashboard/hooks/useDocuments"


const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type
  const fileName = file.file instanceof File ? file.file.name : file.file.name

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />
  } else if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />
  } else if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />
  } else if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />
  } else if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />
  } else if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />
  }
  return <FileIcon className="size-4 opacity-60" />
}

export function InputDocument({ accept = ["*"], chatId }: { accept?: string[]; chatId?: string }) {
  const maxSize = 100 * 1024 * 1024 // 100MB
  const maxFiles = 10

  const { createDocument } = useDocuments(chatId)
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
      // Automatically upload new files
      addedFiles.forEach(fileItem => {
        handleUpload(fileItem)
      })
    }
  })

  const handleUpload = async (fileItem: any) => {
    setUploadingFiles(prev => new Set(prev).add(fileItem.id))

    const formData = new FormData()
    formData.append('file', fileItem.file)

    // Include chatId if provided
    if (chatId) {
      formData.append('chatId', chatId)
    }

    try {
      await createDocument.mutateAsync(formData)
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
      {/* Drop area */}
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
          <p className="mb-1.5 text-sm font-medium">Upload documents</p>
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
