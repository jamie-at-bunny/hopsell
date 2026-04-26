import { useRef } from "react";
import { useBunnyUpload } from "@bunny.net/upload-react";
import { getInitials } from "~/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

interface AvatarUploadProps {
  src?: string | null;
  name: string;
  buttonLabel?: string;
  hint?: string;
  disabled?: boolean;
  onUpload: (url: string) => void;
}

export function AvatarUpload({
  src,
  name,
  buttonLabel = "Change photo",
  hint,
  disabled,
  onUpload,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addFiles, isUploading } = useBunnyUpload({
    endpoint: "/api/upload",
    accept: ["image/*"],
    maxFiles: 1,
    onComplete: (results) => {
      const url = results[0]?.url;
      if (url) onUpload(url);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      addFiles(files);
    }
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback>{getInitials(name || "U")}</AvatarFallback>
      </Avatar>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading ? "Uploading..." : buttonLabel}
        </Button>
        {hint && (
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        )}
      </div>
    </div>
  );
}
