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
          "text-sm font-medium hover:text-accent transition-colors",
          className
        )}
        aria-label="Switch language"
      >
        {language === 'en' ? 'العربية' : 'EN'}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-secondary p-1", className)}>
      {(Object.keys(languages) as LanguageCode[]).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
            language === lang
              ? "bg-primary text-primary-foreground shadow-sm"
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
