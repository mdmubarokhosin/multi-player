"use client";

import { useState, useEffect } from "react";

import { FolderPlus, Grid2X2, List, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { type FileManagerView, files, folders } from "./_components/data";
import { FileGridView } from "./_components/file-grid-view";
import { FileListView } from "./_components/file-list-view";
import { FileManagerToolbar } from "./_components/file-manager-toolbar";
import { FoldersSection } from "./_components/folders-section";

export default function FileManagerPage() {
  const [activeView, setActiveView] = useState<FileManagerView>("grid");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "list") {
      setActiveView("list");
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl leading-none tracking-tight">My files</h1>
          <p className="text-muted-foreground text-sm">Organize, share, and find workspace files.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FolderPlus data-icon="inline-start" />
            New folder
          </Button>
          <Button>
            <Upload data-icon="inline-start" />
            Upload
          </Button>
        </div>
      </div>
      <FileManagerToolbar />
      <FoldersSection folders={folders} />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-lg">All files</h2>
          <ToggleGroup type="single" variant="outline" size="sm" spacing={0} value={activeView} aria-label="File view">
            <ToggleGroupItem value="grid" asChild>
              <a href="?view=grid">
                <Grid2X2 />
                Grid View
              </a>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" asChild>
              <a href="?view=list">
                <List />
                List View
              </a>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {activeView === "list" ? <FileListView files={files} /> : <FileGridView files={files} />}
      </div>
    </div>
  );
}
