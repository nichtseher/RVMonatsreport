import {
  Building2,
  Briefcase,
  CalendarDays,
  GraduationCap,
  Handshake,
  Home,
  Keyboard,
  Lightbulb,
  MessageSquare,
  Navigation,
  Package,
  PartyPopper,
  Phone,
  School,
  Sparkles,
  Star,
  Target,
  Tent,
  Thermometer,
  Umbrella,
  Users,
  Wrench,
  Globe,
  Car,
} from "lucide-react";

/**
 * Übersetzt das gespeicherte Symbol einer Kategorie in ein echtes Icon.
 *
 * Warum das vollständig sein muss: Findet sich kein Eintrag, zeichnet
 * CounterField das Emoji roh. Emojis sehen auf jedem Betriebssystem anders
 * aus, folgen keinem Farbschema und lassen sich im Hochkontrast-Modus nicht
 * umfärben -- ausgerechnet dort, wo es am meisten zählt.
 *
 * Die Emojis bleiben als *gespeicherter Wert* erhalten: So bleiben bestehende
 * Kategorien und alte Datensicherungen gültig, und der Geräte-Sync mit einer
 * älteren Fassung funktioniert weiter. Nur die Darstellung ändert sich.
 *
 * Vollständigkeit wird geprüft: scripts/checks/symbole.ts vergleicht diese
 * Karte gegen die Standardfelder und gegen die Auswahlliste für eigene
 * Kategorien.
 */
export const ICON_KARTE: Record<string, any> = {
  // Standard / eigene Kategorien
  "⭐": Star,
  // Vorführungen & Auslieferungen
  "🏫": School,
  "💼": Briefcase,
  "🎒": GraduationCap,
  "🏢": Building2,
  // Schulung, Support, Akquise
  "👨‍🏫": GraduationCap,
  "📞": Phone,
  "☎️": Phone,
  "🤝": Handshake,
  "🎪": Tent,
  "🎯": Target,
  // Spezialprodukte
  "🌍": Globe,
  "🦯": Navigation,
  // Arbeitszeit & Büro
  "🗓️": CalendarDays,
  "⌨️": Keyboard,
  "🚗": Car,
  "🌴": Umbrella,
  "🤒": Thermometer,
  "🎉": PartyPopper,
  // Weitere Auswahlmöglichkeiten für eigene Kategorien
  "👥": Users,
  "📦": Package,
  "💡": Lightbulb,
  "🛠️": Wrench,
  "💬": MessageSquare,
  // Altbestand aus früheren Fassungen
  "🏠": Home,
  "🔧": Wrench,
  "✨": Sparkles,
};

export const getIconForString = (iconString: string | undefined) => {
  if (!iconString) return null;
  return ICON_KARTE[iconString] || null;
};
