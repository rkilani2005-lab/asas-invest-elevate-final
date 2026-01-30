import { useLanguage } from '@/contexts/LanguageContext';
import { languages, LanguageCode } from '@/i18n/config';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal';
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'default',
  className 
}) => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang: LanguageCode = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleLanguage}
        className={cn(
          "text-sm font-medium text-muted-foreground hover:text-accent transition-colors",
          className
        )}
        aria-label="Switch language"
      >
        {language === 'en' ? 'العربية' : 'EN'}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 border border-border p-1", className)}>
      {(Object.keys(languages) as LanguageCode[]).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-all duration-300 tracking-wider",
            language === lang
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={`Switch to ${languages[lang].name}`}
        >
          {lang === 'en' ? 'EN' : 'ع'}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
