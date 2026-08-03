import type { ImgHTMLAttributes } from 'react'
import type { CategoryKey } from '../data/catalog'

type IconProps = ImgHTMLAttributes<HTMLImageElement> & {
  category: CategoryKey
}

const CATEGORY_ICON_PATHS: Record<CategoryKey, string> = {
  chicken: '/icons/chicken.svg',
  beef: '/icons/beef.svg',
  pork: '/icons/pork.svg',
  lamb: '/icons/lamb.svg',
  wild_boar: '/icons/wild-boar.svg',
  turkey: '/icons/turkey.svg',
  fish: '/icons/fish.svg',
  duck: '/icons/duck.svg',
  other: '/icons/meat.svg',
}

export function CategoryIcon({ category, className, alt = '', ...props }: IconProps) {
  return (
    <img
      alt={alt}
      aria-hidden="true"
      className={className}
      decoding="async"
      loading="eager"
      src={CATEGORY_ICON_PATHS[category]}
      {...props}
    />
  )
}
