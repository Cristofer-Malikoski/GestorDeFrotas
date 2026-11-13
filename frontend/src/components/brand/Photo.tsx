import { cn } from '@/lib/cn'

const base = import.meta.env.BASE_URL

/** Foto responsiva (AVIF com fallback WebP). Arquivos e licenças: docs/product/image-assets.md */
export function Photo({
  name,
  widths,
  alt,
  sizes = '100vw',
  className,
  imgClassName,
  priority,
  position = 'center',
}: {
  name: string
  widths: number[]
  alt: string
  sizes?: string
  className?: string
  imgClassName?: string
  priority?: boolean
  position?: string
}) {
  const set = (ext: string) => widths.map((w) => `${base}images/${name}-${w}.${ext} ${w}w`).join(', ')
  const fallback = `${base}images/${name}-${widths[widths.length - 1]}.webp`
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={cn('h-full w-full object-cover', imgClassName)}
        style={{ objectPosition: position }}
      />
    </picture>
  )
}
