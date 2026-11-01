import React from 'react';
import { EventCategory, VendorCategory } from '../types/domain';

export type VisualSceneType =
  | 'wedding'
  | 'birthday'
  | 'community'
  | 'college'
  | 'festival'
  | 'custom'
  | 'venue_courtyard'
  | 'catering_feast'
  | 'photography_lens'
  | 'floral_mandap'
  | 'bridal_atelier'
  | 'acoustic_stage';

export type EditorialSceneType = VisualSceneType;

export const STITCH_ASSETS = {
  palaceHero:
    '/assets/stitch_import/stitch_gatherly_ai_event_planner/dramatic_ultra_luxury_indian_wedding_reception_hero_composition_majestic/screen.png',
  floralMandap:
    '/assets/stitch_import/stitch_gatherly_ai_event_planner/high_end_indian_wedding_decor_floral_installation_majestic_mandap_with_gold/screen.png',
  sangeetCanopy:
    '/assets/stitch_import/stitch_gatherly_ai_event_planner/intimate_royal_sangeet_night_party_under_illuminated_canopy_fairy_lights_canopy/screen.png',
} as const;

interface EditorialSceneProps {
  scene: VisualSceneType;
  className?: string;
  alt?: string;
  aspectClass?: string;
  overlayCaption?: string;
  overlaySubcaption?: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
}

export function mapCategoryToScene(category: EventCategory | string): VisualSceneType {
  switch (category) {
    case 'wedding':
      return 'wedding';
    case 'birthday':
      return 'birthday';
    case 'community':
      return 'community';
    case 'college':
      return 'college';
    case 'festival':
      return 'festival';
    default:
      return 'custom';
  }
}

export function mapVendorCategoryToScene(category: VendorCategory | string): VisualSceneType {
  switch (category) {
    case 'Venues':
      return 'venue_courtyard';
    case 'Caterers':
      return 'catering_feast';
    case 'Photographers':
      return 'photography_lens';
    case 'Decorators':
    case 'Florists':
      return 'floral_mandap';
    case 'Makeup Artists':
    case 'Invitation Designers':
      return 'bridal_atelier';
    case 'DJs & Entertainers':
    case 'Transportation':
    default:
      return 'acoustic_stage';
  }
}

export function getStitchPhotoForScene(scene: VisualSceneType): string {
  switch (scene) {
    case 'wedding':
    case 'venue_courtyard':
    case 'catering_feast':
      return STITCH_ASSETS.palaceHero;
    case 'floral_mandap':
    case 'bridal_atelier':
    case 'photography_lens':
      return STITCH_ASSETS.floralMandap;
    case 'birthday':
    case 'festival':
    case 'community':
    case 'college':
    case 'acoustic_stage':
    default:
      return STITCH_ASSETS.sangeetCanopy;
  }
}

/**
 * Renders high-resolution local Stitch editorial photography with warm luxury scrims
 * and architectural overlays. Uses local assets bundled in /public/assets/stitch_import/
 * for 100% hermetic reliability.
 */
export const EditorialScene: React.FC<EditorialSceneProps> = ({
  scene,
  className = '',
  alt = 'Gatherly AI Editorial Celebration Scene',
  aspectClass = '',
  overlayCaption,
  overlaySubcaption,
  overlayTitle,
  overlaySubtitle,
}) => {
  const finalCaption = overlayCaption || overlayTitle;
  const finalSubcaption = overlaySubcaption || overlaySubtitle;
  const photoSrc = getStitchPhotoForScene(scene);

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden select-none bg-[#282522] group ${aspectClass} ${className}`}
    >
      <img
        src={photoSrc}
        alt={alt}
        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />

      {/* Warm Luxury Editorial Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#282522]/85 via-[#282522]/25 to-transparent pointer-events-none" />

      {(finalCaption || finalSubcaption) && (
        <div className="absolute inset-x-0 bottom-0 p-5 text-[#F8F5EF] pointer-events-none">
          {finalSubcaption && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#E9D8B4] mb-1">
              {finalSubcaption}
            </p>
          )}
          {finalCaption && (
            <p className="font-serif text-xl font-normal leading-snug text-[#FAF2ED]">
              {finalCaption}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
