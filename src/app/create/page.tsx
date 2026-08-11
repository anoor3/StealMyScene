import type { Metadata } from "next";
import { LocalVideoCreator } from "@/components/local-video-creator";

export const metadata: Metadata = {
  title: "Dub your own video",
  description: "Trim a local video, perform the line, and download your private dub without publishing the source."
};

export default function CreatePage() {
  return <LocalVideoCreator />;
}
