import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { youTubeEmbed } from "@/lib/youtube";

type Props = {
  videoId: string | null;
  title: string;
  onClose: () => void;
};

export function VideoPlayerDialog({ videoId, title, onClose }: Props) {
  return (
    <Dialog open={!!videoId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">{title}</DialogTitle>
        </DialogHeader>
        {videoId && (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-secondary">
            <iframe
              src={youTubeEmbed(videoId)}
              title={title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
