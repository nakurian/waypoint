import Image from 'next/image';

export function Figure({ src, caption, alt }: { src: string; caption: string; alt?: string }) {
  return (
    <figure className="my-6">
      <div className="rounded-md border overflow-hidden bg-muted/30">
        <Image src={src} alt={alt ?? caption} width={1280} height={720} />
      </div>
      <figcaption className="mt-2 text-sm text-muted-foreground text-center">{caption}</figcaption>
    </figure>
  );
}
