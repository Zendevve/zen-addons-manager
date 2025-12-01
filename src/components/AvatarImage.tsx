import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText: string
  containerClassName?: string
}

export function AvatarImage({ src, alt, fallbackText, className, containerClassName, ...props }: AvatarImageProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground bg-secondary", className)}>
        {fallbackText}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("w-full h-full object-cover", className)}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}
