import { 
  Building2, 
  Briefcase, 
  GraduationCap, 
  School,
  Phone,
  Handshake,
  Tent,
  Target,
  Globe,
  Navigation,
  Car,
  Home,
  Wrench,
  HelpCircle
} from "lucide-react";

export const getIconForString = (iconString: string | undefined) => {
  if (!iconString) return null;
  
  const map: Record<string, any> = {
    "🏫": School,
    "💼": Briefcase,
    "🎒": GraduationCap,
    "🏢": Building2,
    "👨‍🏫": GraduationCap,
    "📞": Phone,
    "🤝": Handshake,
    "🎪": Tent,
    "🎯": Target,
    "🌍": Globe,
    "🦯": Navigation,
    "🚗": Car,
    "🏠": Home,
    "🔧": Wrench,
  };

  return map[iconString] || null; // Return null if it's an unmapped emoji, or we could return a default icon
};
