import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { languages, LanguageCode } from '@/i18n/config';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal';
  className?: string;
  isDarkBackground?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'default',
  className,
  isDarkBackground = false
}) => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

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
        aria-label={t('aria.switchLanguage')}
      >
        {language === 'en' ? 'العربية' : 'EN'}
      </button>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1 border p-1",
      isDarkBackground ? "border-white/30" : "border-border",
      className
    )}>
      {(Object.keys(languages) as LanguageCode[]).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-all duration-300 tracking-wider",
            language === lang
              ? isDarkBackground 
                ? "bg-white/20 text-white" 
                : "bg-accent text-accent-foreground"
              : isDarkBackground
                ? "text-white/70 hover:text-white"
                : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={t('aria.switchTo', { lang: languages[lang].name })}
        >
          {lang === 'en' ? 'EN' : 'ع'}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
