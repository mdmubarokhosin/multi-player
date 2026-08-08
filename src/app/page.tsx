'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updatePassword, 
  sendPasswordResetEmail, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  UserProfile,
  OvertimeEntry,
  createUserProfile,
  getUserProfile,
  getAllUsers,
  updateUserProfile,
  deleteUserProfile,
  addOvertimeEntry,
  updateOvertimeEntry,
  deleteOvertimeEntry,
  subscribeOvertimeEntries,
  subscribeUserProfile,
  getAdminOvertimeData,
  toggleMonthLock,
  getAllOvertimeEntries,
  ActivityLog,
  logActivity,
  getActivityLogs,
  PaymentStatus,
  setPaymentStatus,
  getPaymentStatuses,
  getUserPaymentStatuses,
  adminAddOvertimeEntry,
  adminDeleteOvertimeEntry,
  subscribeAppConfig,
  setAppConfig,
} from '@/lib/database-helpers';
import {
  cn,
  getMonthKey,
  getMonthName,
  formatDate,
  isSunday,
  isWeeklyHoliday,
  weeklyHolidayLabel,
  dayNames,
  dayNamesFull,
  formatTaka,
  calcEntryMoney,
  calcMonthSummary,
  debounce,
  resizeImage,
  uploadToImgBB,
  getWeekNumber,
  getCycleMonthKey,
  getCycleMonthName,
  getCycleCalendarDays,
  getCycleFetchMonthKeys,
  filterEntriesForCycle,
  getAbsentDaysForCycle,
  getCycleRange,
  CycleDay,
} from '@/lib/utils';
// Custom Holidays & Rate History are imported from database-helpers
import {
  CustomHoliday,
  addCustomHoliday,
  subscribeCustomHolidays,
  deleteCustomHoliday,
  RateChangeLog,
  addRateChangeLog,
  getRateChangeHistory,
} from '@/lib/database-helpers';
import {
  getHolidayInfo,
  getDayRate,
  getSpecialDayName,
  calcEntryMoneyWithHoliday,
  calcMonthSummaryWithHoliday,
} from '@/lib/utils';
import {
  generateMonthlyReportHTML,
  generateSalarySlipHTML,
  openPrintWindow,
} from '@/lib/report-generator';
import { I18nProvider, useT, useI18n } from '@/lib/i18n';
import {
  saveOfflineAction,
  getOfflineQueue,
  removeOfflineAction as removeActionFromQueue,
  replaceOfflineAction as replaceActionInQueue,
  syncOfflineQueue,
  getPendingCount,
  type OfflineAction,
} from '@/lib/offline-sync';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend, Title);

// ==================== TYPES ====================
type SiteConfig = {
  siteTitle?: string;
  siteDescription?: string;
  siteFooter?: string;
  siteLogo?: string;
  imgbbApiKey?: string;
};

const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteTitle: 'Overtime Tracker BD',
  siteDescription: 'ওভারটাইম ক্যালকুলেশন সিস্টেম',
  siteFooter: 'আপনার ওভারটাইম সঠিকভাবে ট্র্যাক করুন',
  siteLogo: '',
};

// ==================== ICONS ====================
const BI = {
  clock: 'bi-clock',
  personPlus: 'bi-person-plus',
  boxArrowRight: 'bi-box-arrow-right',
  shieldCheck: 'bi-shield-check',
  calendarCheck: 'bi-calendar-check',
  people: 'bi-people',
  graphUp: 'bi-graph-up',
  gear: 'bi-gear',
  plus: 'bi-plus-lg',
  trash: 'bi-trash',
  pencil: 'bi-pencil',
  eye: 'bi-eye',
  dashCircle: 'bi-dash-circle',
  checkCircle: 'bi-check-circle',
  xCircle: 'bi-x-circle',
  clipboardData: 'bi-clipboard-data',
  house: 'bi-house',
  chevronLeft: 'bi-chevron-left',
  chevronRight: 'bi-chevron-right',
  chevronUp: 'bi-chevron-up',
  chevronDown: 'bi-chevron-down',
  arrowLeft: 'bi-arrow-left',
  arrowRight: 'bi-arrow-right',
  exclamationTriangle: 'bi-exclamation-triangle',
  search: 'bi-search',
  funnel: 'bi-funnel',
  download: 'bi-download',
  personGear: 'bi-person-gear',
  clockHistory: 'bi-clock-history',
  award: 'bi-award',
  bell: 'bi-bell',
  threeDots: 'bi-three-dots-vertical',
  shieldLock: 'bi-shield-lock',
  personCircle: 'bi-person-circle',
  speedometer: 'bi-speedometer',
  journalText: 'bi-journal-text',
  calculator: 'bi-calculator',
  cashCoin: 'bi-cash-coin',
  wallet2: 'bi-wallet2',
  cashStack: 'bi-cash-stack',
  currencyExchange: 'bi-currency-exchange',
  calendarEvent: 'bi-calendar-event',
  calendarWeek: 'bi-calendar-week',
  key: 'bi-key',
  lock: 'bi-lock',
  envelope: 'bi-envelope',
  camera: 'bi-camera',
  personBadge: 'bi-person-badge',
  fileEarmarkPdf: 'bi-file-earmark-pdf',
  fileText: 'bi-file-text',
  unlock: 'bi-unlock',
  barChart: 'bi-bar-chart',
  arrowUp: 'bi-arrow-up',
  arrowDown: 'bi-arrow-down',
  calendarX: 'bi-calendar-x',
  calendarRange: 'bi-calendar-range',
  // Feature #11-#15 icons
  send: 'bi-send',
  patchCheck: 'bi-patch-check',
  patchExclamation: 'bi-patch-exclamation',
  xLg: 'bi-x-lg',
  palette: 'bi-palette',
  moonStars: 'bi-moon-stars',
  sun: 'bi-sun',
  beach: 'bi-beach2',
  umbrella: 'bi-umbrella',
  globe: 'bi-globe',
  bandaid: 'bi-bandaid',
  cash: 'bi-cash',
  dash: 'bi-dash',
  plusCircle: 'bi-plus-circle',
  calendar2Check: 'bi-calendar2-check',
  hourglassSplit: 'bi-hourglass-split',
  arrowsCollapse: 'bi-arrows-collapse',
  bodyText: 'bi-body-text',
  shieldExclamation: 'bi-shield-exclamation',
  sendCheck: 'bi-send-check',
  receipt: 'bi-receipt',
  piggyBank: 'bi-piggy-bank',
  wallet: 'bi-wallet',
  xCircleFill: 'bi-x-circle-fill',
  check2Circle: 'bi-check2-circle',
  calendarPlus: 'bi-calendar-plus',
  alarm: 'bi-alarm',
  personCheck: 'bi-person-check',
  calendar3: 'bi-calendar3',
  copy: 'bi-copy',
  layers: 'bi-layers',
  upload: 'bi-upload',
  fileSpreadsheet: 'bi-file-spreadsheet',
  gift: 'bi-gift',
  star: 'bi-star',
  history: 'bi-arrow-repeat',
  wifiOff: 'bi-wifi-off',
  alarmFill: 'bi-alarm-fill',
  arrowClockwise: 'bi-arrow-clockwise',
  cloudArrowUp: 'bi-cloud-arrow-up',
  // Admin feature icons
  table: 'bi-table',
  listTask: 'bi-list-task',
  coin: 'bi-coin',
  fileEarmarkText: 'bi-file-earmark-text',
  personLinesFill: 'bi-person-lines-fill',
  check2Square: 'bi-check2-square',
  skipForward: 'bi-skip-forward',
  journalCheck: 'bi-journal-check',
  // User Guide icons
  book: 'bi-book',
  infoCircle: 'bi-info-circle',
  lightbulb: 'bi-lightbulb',
  check2All: 'bi-check2-all',
  arrowRightCircle: 'bi-arrow-right-circle',
  cursor: 'bi-cursor',
  chatSquareText: 'bi-chat-square-text',
  grid3x3: 'bi-grid-3x3',
};

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <i className={cn('bi', name, className)} />;
}

// ==================== DARK MODE HOOK (Feature #15) ====================
function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('ot-dark-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved === 'true' || (!saved && prefersDark);
    setDark(isDark);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ot-dark-mode', String(dark));
  }, [dark]);
  return [dark, setDark] as const;
}

// ==================== TOAST NOTIFICATION ====================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
  };

  return (
    <div className={cn('fixed top-4 left-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-lg mx-auto animate-slide-down', colors[type])}>
      <Icon name={type === 'success' ? BI.checkCircle : type === 'error' ? BI.xCircle : BI.bell} className="text-lg shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100">
        <i className="bi bi-x-lg text-sm" />
      </button>
    </div>
  );
}

// ==================== LOADING SPINNER ====================
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
  return <span className={cn('border-emerald-200 border-t-emerald-600 rounded-full animate-spin', sizes[size])} />;
}

// ==================== CONFIRM DIALOG ====================
function ConfirmDialog({ message, onConfirm, onCancel, dark }: { message: string; onConfirm: () => void; onCancel: () => void; dark: boolean }) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={onCancel}>
      <div className={cn('rounded-2xl shadow-2xl w-full max-w-sm p-5', dark ? 'bg-[#1E1E1E]' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', dark ? 'bg-red-900/30' : 'bg-red-100')}>
            <Icon name={BI.exclamationTriangle} className="text-red-500 text-xl" />
          </div>
          <h3 className={cn('font-semibold text-sm', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{t('confirm')}</h3>
        </div>
        <p className={cn('text-sm mb-5', dark ? 'text-gray-400' : 'text-gray-600')}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={cn('flex-1 py-2.5 rounded-xl border font-medium transition-all active:scale-[0.98]', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all active:scale-[0.98]"
          >
            {t('yesDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}



// ==================== PASSWORD CHANGE MODAL ====================
function PasswordChangeModal({ onClose, onToast, dark }: { onClose: () => void; onToast: (msg: string, type: 'success' | 'error') => void; dark: boolean }) {
  const t = useT();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [error, setError] = useState('');
  const currentUser = auth.currentUser;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 6) { setError(t('pwdMin6')); return; }
    if (newPass !== confirmPass) { setError(t('pwdMismatch')); return; }
    if (!currentUser || !currentUser.email) { setError(t('pwdNotLoggedIn')); return; }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPass);
      onToast(t('pwdChanged'), 'success');
      onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(t('pwdWrong'));
      } else if (code === 'auth/weak-password') {
        setError(t('pwdWeak'));
      } else if (code === 'auth/too-many-requests') {
        setError(t('pwdManyAttempts'));
      } else {
        setError(t('pwdError'));
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className={cn('rounded-2xl shadow-2xl w-full max-w-sm', dark ? 'bg-[#1E1E1E]' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
        <div className={cn('p-4 border-b flex items-center justify-between', dark ? 'border-gray-700' : 'border-gray-100')}>
          <h3 className={cn('font-semibold flex items-center gap-2', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>
            <Icon name={BI.lock} className="text-emerald-600" /> {t('changePassword')}
          </h3>
          <button onClick={onClose} className={cn('p-1 rounded-lg text-gray-400', dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}>
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>
        <form onSubmit={handleChangePassword} className="p-4 space-y-3">
          <div>
            <label className={cn('block text-sm font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('currentPassword')}</label>
            <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} required className={cn('w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder="••••••••" />
          </div>
          <div>
            <label className={cn('block text-sm font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('newPassword')}</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required minLength={6} className={cn('w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder={t('min6Chars')} />
          </div>
          <div>
            <label className={cn('block text-sm font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('confirmNewPassword')}</label>
            <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} required minLength={6} className={cn('w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder={t('typeAgain')} />
          </div>
          {error && (
            <div className={cn('text-sm p-3 rounded-xl border flex items-center gap-2', dark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 text-red-600 border-red-100')}>
              <Icon name={BI.exclamationTriangle} /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cn('flex-1 py-2.5 rounded-xl border font-medium transition-all active:scale-[0.98] text-sm', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{t('cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98] text-sm">
              {loading ? <LoadingSpinner size="sm" /> : t('change')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




// ==================== HOLIDAY MANAGEMENT MODAL (Feature #12) ====================
function HolidayModal({ onClose, onToast, isAdmin, weeklyHolidayDays, weeklyHolName }: { onClose: () => void; onToast: (msg: string, type: 'success' | 'error') => void; isAdmin: boolean; weeklyHolidayDays: number[]; weeklyHolName: string }) {
  const t = useT();
  const [holidays, setHolidays] = useState<CustomHoliday[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState(2);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeCustomHolidays(setHolidays);
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName) { onToast(t('enterDateName'), 'error'); return; }
    if (isWeeklyHoliday(newDate, weeklyHolidayDays)) { onToast(weeklyHolName + ' ' + t('alreadyDoubleRate'), 'error'); return; }
    setLoading(true);
    try {
      await addCustomHoliday({ date: newDate, name: newName, rate: newRate });
      setNewDate(''); setNewName(''); setNewRate(2);
      onToast(t('holidayAdded'), 'success');
    } catch {
      onToast(t('holidayAddError'), 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomHoliday(id);
      onToast(t('holidayDeleted'), 'success');
    } catch {
      onToast(t('holidayDeleteError'), 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon name={BI.umbrella} className="text-amber-600" /> {t('customHoliday')}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {/* Holiday List */}
        <div className="max-h-60 overflow-y-auto">
          {holidays.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">{t('noCustomHoliday')}</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {holidays.sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{h.name}</div>
                    <div className="text-xs text-gray-400">{h.date} · ×{h.rate}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(h.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                      <Icon name={BI.trash} className="text-sm" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Form (Admin only) */}
        {isAdmin && (
          <form onSubmit={handleAdd} className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase">{t('addNewHoliday')}</h4>
            <div>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('holidayNamePh')} required className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
              </div>
              <div>
                <select value={newRate} onChange={e => setNewRate(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                  <option value={2}>{t('x2Double')}</option>
                  <option value={1.5}>{t('x15')}</option>
                  <option value={3}>{t('x3')}</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition-all disabled:opacity-50 text-sm">
              {loading ? <LoadingSpinner size="sm" /> : t('add')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


// ==================== LOGIN PAGE ====================

function LoginPage({ siteConfig }: { siteConfig: SiteConfig }) {
  const t = useT();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dutyStartTime, setDutyStartTime] = useState('09:00');
  const [dutyHours, setDutyHours] = useState(8);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          setError(t('enterName'));
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(cred.user.uid, {
          email,
          displayName: displayName.trim(),
          role: 'user',
          createdAt: new Date().toISOString(),
          isActive: true,
          dutyStartTime,
          dutyHours,
          hourlyRate: 0,
          otRate: 0,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError(t('wrongCredential'));
      } else if (code === 'auth/email-already-in-use') {
        setError(t('emailExists'));
      } else if (code === 'auth/weak-password') {
        setError(t('pwdMin6_2'));
      } else if (code === 'auth/invalid-email') {
        setError(t('validEmail'));
      } else if (code === 'auth/too-many-requests') {
        setError(t('manyAttempts'));
      } else {
        setError(t('genericError'));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
            {siteConfig.siteLogo ? <img src={siteConfig.siteLogo} alt="Logo" className="w-full h-full object-cover rounded-2xl" /> : <Icon name={BI.clock} className="text-white text-2xl" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{siteConfig.siteTitle}</h1>
          <p className="text-gray-500 mt-1">{siteConfig.siteDescription}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={cn('flex-1 py-2.5 rounded-lg text-sm font-medium transition-all', !isRegister ? 'bg-white shadow text-emerald-700' : 'text-gray-500')}
            >
              {t('login')}
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={cn('flex-1 py-2.5 rounded-lg text-sm font-medium transition-all', isRegister ? 'bg-white shadow text-emerald-700' : 'text-gray-500')}
            >
              {t('registration')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('name')}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder={t('enterYourName')}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('dutyStart')}</label>
                    <input
                      type="time"
                      value={dutyStartTime}
                      onChange={(e) => setDutyStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('dutyHours')}</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={dutyHours}
                      onChange={(e) => setDutyHours(parseInt(e.target.value) || 8)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-center"
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="example@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2">
                <Icon name={BI.exclamationTriangle} />
                {error}
              </div>
            )}

            <div className="text-right">
              <button type="button" onClick={async () => {
                if (!email) { setError(t('enterEmail')); return; }
                try {
                  await sendPasswordResetEmail(auth, email);
                  setError('');
                  setForgotMsg(t('resetSent'));
                } catch {
                  setError(t('resetFailed'));
                }
              }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                {t('forgotPassword')}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : isRegister ? (
                <>
                  <Icon name={BI.personPlus} /> {t('registerBtn')}
                </>
              ) : (
                t('loginBtn')
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {siteConfig.siteFooter}
        </p>
        {forgotMsg && (
          <div className="fixed top-4 left-4 right-4 z-[100] max-w-sm mx-auto bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-down">
            <Icon name={BI.checkCircle} className="shrink-0" />
            <span className="text-sm flex-1">{forgotMsg}</span>
            <button onClick={() => setForgotMsg('')} className="shrink-0 opacity-70 hover:opacity-100">
              <i className="bi bi-x-lg text-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== USER DASHBOARD ====================
function UserDashboard({ user, profile, onLogout, siteConfig, isOnline }: { user: { uid: string }; profile: UserProfile; onLogout: () => void; siteConfig: SiteConfig; isOnline: boolean }) {
  const t = useT();
  const cycleDay = profile.salaryCycleDay || 1;
  const [currentMonth, setCurrentMonth] = useState(getCycleMonthKey(new Date(), cycleDay));
  const [firebaseEntries, setFirebaseEntries] = useState<OvertimeEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<OvertimeEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [otHours, setOtHours] = useState(0);
  const [shiftHours, setShiftHours] = useState(profile.dutyHours || 8);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [analysisTab, setAnalysisTab] = useState<'chart' | 'comparison' | 'weekly' | 'absent' | 'yearly'>('chart');
  const [allEntries, setAllEntries] = useState<OvertimeEntry[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Feature #12: Custom Holidays state
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  // Feature #18: Copy Entry
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceEntry, setCopySourceEntry] = useState<OvertimeEntry | null>(null);
  const [copyTargetDate, setCopyTargetDate] = useState('');

  // Feature #19: Bulk Entry
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkOtHours, setBulkOtHours] = useState(0);
  const [bulkShiftHours, setBulkShiftHours] = useState(0);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkSkipHolidays, setBulkSkipHolidays] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Feature #20: Shift time
  const [shiftStart, setShiftStart] = useState(profile.dutyStartTime || '09:00');
  const [shiftEnd, setShiftEnd] = useState('');
  // Meal break hours (default 1 hour)
  const [mealBreakHours, setMealBreakHours] = useState(1);

  // Feature #24: Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Feature #21: Rate history
  const [showRateHistory, setShowRateHistory] = useState(false);
  const [rateHistory, setRateHistory] = useState<RateChangeLog[]>([]);

  // Offline sync: pending actions state
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>(() => getOfflineQueue());

  // পর্যায়ক্রমিকভাবে localStorage থেকে pendingActions রিফ্রেশ (সিঙ্কের পর আপডেট হবে)
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingActions(getOfflineQueue());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Firebase entries এবং offline pending actions মার্জ করে display-এর জন্য entries তৈরি
  const entries = useMemo(() => {
    let result = [...firebaseEntries];
    for (const action of pendingActions) {
      if (action.type === 'add' && action.entryData) {
        if (!result.find(e => e.date === action.entryData!.date)) {
          result.push({
            id: 'offline-' + action.id,
            date: action.entryData.date,
            overtimeHours: action.entryData.overtimeHours,
            shiftHours: action.entryData.shiftHours,
            note: action.entryData.note,
            createdAt: action.timestamp,
          });
        }
      } else if (action.type === 'update' && action.entryId && action.updateData) {
        const idx = result.findIndex(e => e.id === action.entryId || e.id === 'offline-' + action.entryId);
        if (idx >= 0) result[idx] = { ...result[idx], ...action.updateData };
      } else if (action.type === 'delete' && action.entryId) {
        result = result.filter(e => e.id !== action.entryId && e.id !== 'offline-' + action.entryId);
      }
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [firebaseEntries, pendingActions]);

  const addOfflineActionLocal = useCallback((action: OfflineAction) => {
    saveOfflineAction(action);
    setPendingActions(prev => [...prev, action]);
  }, []);
  const removeOfflineActionLocal = useCallback((id: string) => {
    removeActionFromQueue(id);
    setPendingActions(prev => prev.filter(a => a.id !== id));
  }, []);
  const replaceOfflineActionLocal = useCallback((id: string, replacement: OfflineAction) => {
    replaceActionInQueue(id, replacement);
    setPendingActions(prev => prev.map(a => a.id === id ? replacement : a));
  }, []);

  // Feature #15: Dark mode
  const [dark, setDark] = useDarkMode();

  // Weekly holiday days (from user profile, default: Sunday = [0])
  const weeklyHolidayDays = (profile.weeklyHolidayDays && profile.weeklyHolidayDays.length > 0) ? profile.weeklyHolidayDays : [0];
  const weeklyHolName = weeklyHolidayLabel(weeklyHolidayDays);
  const isWeeklyHol = (dateStr: string) => isWeeklyHoliday(dateStr, weeklyHolidayDays);

  // Debounced profile update refs
  const debouncedUpdateRef = useRef<Record<string, ReturnType<typeof debounce>>>({});

  // Debounced profile updater factory
  const getDebouncedUpdater = useCallback((field: string, value: unknown) => {
    const key = field;
    if (!debouncedUpdateRef.current[key]) {
      debouncedUpdateRef.current[key] = debounce(async (val: unknown) => {
        try {
          await updateUserProfile(user.uid, { [field]: val } as Partial<UserProfile>);
          setToast({ message: t('updated'), type: 'success' });
        } catch {
          setToast({ message: t('updateFailed'), type: 'error' });
        }
      }, 800);
    }
    debouncedUpdateRef.current[key](value);
  }, [user.uid]);

  // Load all entries for comparison & yearly (Features #7, #8)
  const loadAllEntries = useCallback(async () => {
    setLoadingAnalysis(true);
    try {
      const data = await getAllOvertimeEntries(user.uid);
      setAllEntries(data);
    } catch {
      setToast({ message: t('dataLoadFailed'), type: 'error' });
    }
    setLoadingAnalysis(false);
  }, [user.uid]);

  // Feature #12: Subscribe to custom holidays
  useEffect(() => {
    const unsub = subscribeCustomHolidays(setCustomHolidays);
    return unsub;
  }, []);

  // Feature #17: Daily reminder notification
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const hasEntryToday = entries.some(e => e.date === today);
    if (!hasEntryToday && !isWeeklyHol(today) && 'Notification' in window && Notification.permission === 'default') {
      // Only ask once per session
      const asked = sessionStorage.getItem('ot-notification-asked');
      if (!asked) {
        sessionStorage.setItem('ot-notification-asked', '1');
        Notification.requestPermission();
      }
    }
    // Check at 9 PM daily if entry is missing
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === 21 && now.getMinutes() < 5) {
        const todayStr = now.toISOString().split('T')[0];
        const hasEntry = entries.some(e => e.date === todayStr);
        if (!hasEntry && !isWeeklyHol(todayStr) && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Overtime Tracker', {
            body: t('notificationBody'),
            icon: '/logo.svg',
          });
        }
      }
    };
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [entries, isWeeklyHol]);

  // Entry Lock check (Feature #5)
  const isMonthLocked = (profile.lockedMonths || []).includes(currentMonth);

  // Subscribe to real-time updates (cycle-aware)
  useEffect(() => {
    const cd = profile.salaryCycleDay || 1;
    const keys = getCycleFetchMonthKeys(currentMonth, cd);
    if (keys.length === 1) {
      const unsub = subscribeOvertimeEntries(user.uid, keys[0], (data) => {
        setFirebaseEntries(data);
      });
      return unsub;
    }
    let entriesMap: Record<string, OvertimeEntry[]> = {};
    const unsubs = keys.map(mk => {
      return subscribeOvertimeEntries(user.uid, mk, (data) => {
        entriesMap[mk] = data;
        const all = Object.values(entriesMap).flat();
        setFirebaseEntries(filterEntriesForCycle(all, currentMonth, cd) as OvertimeEntry[]);
      });
    });
    return () => { unsubs.forEach(fn => fn()); entriesMap = {}; };
  }, [user.uid, currentMonth, profile.salaryCycleDay]);

  // Get rates from profile
  const hourlyRate = profile.hourlyRate || 0;
  const otRate = profile.otRate || 0;

  // Use shared calculation (with holiday support — Feature #12)
  const holidayRateMap = customHolidays.map(h => ({ date: h.date, rate: h.rate }));
  const summary = customHolidays.length > 0
    ? calcMonthSummaryWithHoliday(entries, hourlyRate, otRate, holidayRateMap, weeklyHolidayDays)
    : calcMonthSummary(entries, hourlyRate, otRate, weeklyHolidayDays);

  const navigateMonth = (direction: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(getCycleMonthKey(newDate, cycleDay));
  };

  // Check if selected date is Sunday
  const selectedDateIsSunday = selectedDate ? isWeeklyHol(selectedDate) : false;
  const selectedDateHoliday = selectedDate ? getHolidayInfo(selectedDate, customHolidays) : { isHoliday: false, name: '', rate: 1 };
  const selectedDateSpecial = selectedDateIsSunday || selectedDateHoliday.isHoliday;
  const selectedDateRate = selectedDateIsSunday ? 2 : (selectedDateHoliday.rate || 1);

  const handleSave = async () => {
    if (!selectedDate) return;
    setLoading(true);
    const entryPayload = { date: selectedDate, overtimeHours: otHours, shiftHours, note };

    if (!isOnline) {
      // === অফলাইন মোড ===
      const actionId = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      if (editEntry) {
        if (editEntry.id.startsWith('offline-')) {
          // অফলাইন এন্ট্রি এডিট → আসল 'add' অ্যাকশন আপডেট
          const originalActionId = editEntry.id.replace('offline-', '');
          replaceOfflineActionLocal(originalActionId, {
            id: originalActionId, uid: user.uid, type: 'add',
            monthKey: selectedDate.substring(0, 7), entryData: entryPayload,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Firebase এন্ট্রি এডিট
          addOfflineActionLocal({
            id: actionId, uid: user.uid, type: 'update',
            monthKey: editEntry.date.substring(0, 7), entryId: editEntry.id,
            updateData: entryPayload, timestamp: new Date().toISOString(),
          });
        }
        logActivity({ uid: user.uid, userName: profile.displayName, action: 'edit_entry', details: `এন্ট্রি আপডেট (অফলাইন): ${selectedDate}`, timestamp: new Date().toISOString(), monthKey: currentMonth }).catch(() => {});
      } else {
        addOfflineActionLocal({
          id: actionId, uid: user.uid, type: 'add',
          monthKey: selectedDate.substring(0, 7), entryData: entryPayload,
          timestamp: new Date().toISOString(),
        });
        logActivity({ uid: user.uid, userName: profile.displayName, action: 'add_entry', details: `নতুন এন্ট্রি (অফলাইন): ${selectedDate}`, timestamp: new Date().toISOString(), monthKey: currentMonth }).catch(() => {});
      }
      setToast({ message: t('offlineSaved'), type: 'info' });
      setShowAdd(false); setEditEntry(null); setSelectedDate(''); setOtHours(0);
      setShiftHours(profile.dutyHours || 8); setNote('');
      setLoading(false);
      return;
    }

    // === অনলাইন মোড (আসল Firebase লিখুন) ===
    try {
      if (editEntry) {
        await updateOvertimeEntry(user.uid, editEntry.date.substring(0, 7), editEntry.id, {
          overtimeHours: otHours, shiftHours, note,
        });
        logActivity({ uid: user.uid, userName: profile.displayName, action: 'edit_entry', details: `এন্ট্রি আপডেট: ${selectedDate} (OT: ${otHours}h, Shift: ${shiftHours}h)`, timestamp: new Date().toISOString(), monthKey: currentMonth }).catch(() => {});
        setToast({ message: t('entryUpdated'), type: 'success' });
      } else {
        await addOvertimeEntry(user.uid, {
          date: selectedDate, overtimeHours: otHours, shiftHours, note,
        });
        logActivity({ uid: user.uid, userName: profile.displayName, action: 'add_entry', details: `নতুন এন্ট্রি: ${selectedDate} (OT: ${otHours}h, Shift: ${shiftHours}h)`, timestamp: new Date().toISOString(), monthKey: currentMonth }).catch(() => {});
        setToast({ message: t('newEntryAdded'), type: 'success' });
      }
      setShowAdd(false);
      setEditEntry(null);
      setSelectedDate('');
      setOtHours(0);
      setShiftHours(profile.dutyHours || 8);
      setNote('');
    } catch {
      setToast({ message: t('saveFailed'), type: 'error' });
    }
    setLoading(false);
  };

  const handleEdit = (entry: OvertimeEntry) => {
    setEditEntry(entry);
    setSelectedDate(entry.date);
    setOtHours(entry.overtimeHours);
    setShiftHours(entry.shiftHours);
    setNote(entry.note);
    setShowAdd(true);
  };

  const handleDelete = (entry: OvertimeEntry) => {
    setConfirmAction({
      message: t('confirmDelete', { date: formatDate(entry.date) }),
      onConfirm: async () => {
        if (!isOnline) {
          // অফলাইনে মুছুন
          if (entry.id.startsWith('offline-')) {
            removeOfflineActionLocal(entry.id.replace('offline-', ''));
          } else {
            const actionId = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            addOfflineActionLocal({
              id: actionId, uid: user.uid, type: 'delete',
              monthKey: entry.date.substring(0, 7), entryId: entry.id,
              timestamp: new Date().toISOString(),
            });
          }
          setToast({ message: t('offlineDeleted'), type: 'info' });
          setConfirmAction(null);
          return;
        }
        // অনলাইনে Firebase থেকে মুছুন
        try {
          await deleteOvertimeEntry(user.uid, entry.date.substring(0, 7), entry.id);
          logActivity({ uid: user.uid, userName: profile.displayName, action: 'delete_entry', details: `এন্ট্রি মুছে ফেলা: ${formatDate(entry.date)}`, timestamp: new Date().toISOString(), monthKey: currentMonth }).catch(() => {});
          setToast({ message: t('entryDeleted'), type: 'success' });
        } catch {
          setToast({ message: t('deleteFailed'), type: 'error' });
        }
        setConfirmAction(null);
      },
    });
  };

  // Feature #18: Copy entry
  const handleCopyEntry = async () => {
    if (!copySourceEntry || !copyTargetDate) return;
    if (isWeeklyHol(copyTargetDate)) { setToast({ message: t('cannotCopyOn') + ' ' + weeklyHolName, type: 'error' }); return; }
    if (entries.find(e => e.date === copyTargetDate)) { setToast({ message: t('entryExists'), type: 'error' }); return; }
    setLoading(true);
    if (!isOnline) {
      const actionId = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      addOfflineActionLocal({
        id: actionId, uid: user.uid, type: 'add',
        monthKey: copyTargetDate.substring(0, 7),
        entryData: { date: copyTargetDate, overtimeHours: copySourceEntry.overtimeHours, shiftHours: copySourceEntry.shiftHours, note: copySourceEntry.note },
        timestamp: new Date().toISOString(),
      });
      setToast({ message: t('offlineCopied'), type: 'info' });
      setShowCopyModal(false); setCopySourceEntry(null); setCopyTargetDate('');
      setLoading(false);
      return;
    }
    try {
      await addOvertimeEntry(user.uid, { date: copyTargetDate, overtimeHours: copySourceEntry.overtimeHours, shiftHours: copySourceEntry.shiftHours, note: copySourceEntry.note });
      setToast({ message: t('entryCopied'), type: 'success' });
      setShowCopyModal(false); setCopySourceEntry(null); setCopyTargetDate('');
    } catch { setToast({ message: t('copyFailed'), type: 'error' }); }
    setLoading(false);
  };

  // Feature #19: Bulk entry
  const handleBulkCreate = async () => {
    if (!bulkStartDate || !bulkEndDate) { setToast({ message: t('selectDate'), type: 'error' }); return; }
    if (new Date(bulkEndDate) < new Date(bulkStartDate)) { setToast({ message: t('endBeforeStart'), type: 'error' }); return; }
    setBulkLoading(true);
    try {
      const cur = new Date(bulkStartDate); const end = new Date(bulkEndDate); let count = 0;
      while (cur <= end) {
        const ds = cur.toISOString().split('T')[0];
        if (!isWeeklyHol(ds) && !entries.find(e => e.date === ds)) {
          await addOvertimeEntry(user.uid, { date: ds, overtimeHours: bulkOtHours, shiftHours: bulkShiftHours, note: bulkNote });
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      setToast({ message: t('xEntriesAdded', { n: count }), type: 'success' });
      logActivity({ uid: user.uid, userName: profile.displayName, action: 'add_entry', details: `বাল্ক এন্ট্রি: ${count}টি (${bulkStartDate} থেকে ${bulkEndDate})`, timestamp: new Date().toISOString() }).catch(() => {});
      setShowBulkModal(false); setBulkStartDate(''); setBulkEndDate(''); setBulkOtHours(0); setBulkShiftHours(profile.dutyHours || 8); setBulkNote('');
    } catch { setToast({ message: t('bulkEntryFailed'), type: 'error' }); }
    setBulkLoading(false);
  };

  // Feature #20: Auto-calc hours from shift times (with meal break deduction)
  const handleShiftTimeChange = (start: string, end: string) => {
    setShiftStart(start); setShiftEnd(end);
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      // Subtract meal break if shift is long enough (>= mealBreakHours + some threshold)
      const totalHours = diff / 60;
      const effectiveHours = totalHours > mealBreakHours ? Math.round((totalHours - mealBreakHours) * 10) / 10 : Math.round(totalHours * 10) / 10;
      setShiftHours(effectiveHours);
      const dutyH = profile.dutyHours || 8;
      setOtHours(effectiveHours > dutyH ? Math.round((effectiveHours - dutyH) * 10) / 10 : 0);
    }
  };

  // Feature #23: Real Excel (.xlsx) export
  const handleExcelExport = () => {
    if (entries.length === 0) return;
    import('xlsx').then((XLSX) => {
      const rows = entries.sort((a, b) => a.date.localeCompare(b.date))
        .map(e => {
          const m = calcEntryMoney(e, hourlyRate, otRate, weeklyHolidayDays);
          return {
            [t('csvDate')]: e.date,
            [t('csvDay')]: formatDate(e.date),
            [t('csvOtHours')]: e.overtimeHours,
            [t('csvShiftHours')]: e.shiftHours,
            [t('csvOtMoney')]: m.otMoney,
            [t('csvShiftMoney')]: m.shiftMoney,
            [t('csvTotalMoney')]: m.total,
            [t('csvNote')]: e.note || '',
          };
        });
      // Add summary row
      rows.push({
        [t('csvDate')]: '',
        [t('csvDay')]: t('csvTotal'),
        [t('csvOtHours')]: summary.totalOT,
        [t('csvShiftHours')]: summary.totalShift,
        [t('csvOtMoney')]: summary.otMoney,
        [t('csvShiftMoney')]: summary.shiftMoney,
        [t('csvTotalMoney')]: summary.totalSalary,
        [t('csvNote')]: getMonthName(currentMonth),
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Overtime');
      XLSX.writeFile(wb, `overtime_${currentMonth}.xlsx`);
      setToast({ message: t('excelDownloaded'), type: 'success' });
    });
  };

  // Feature #24: Import CSV
  const handleImport = () => {
    if (!importText.trim()) { setToast({ message: t('csvPastePrompt'), type: 'error' }); return; }
    const lines = importText.trim().split('\n');
    let count = 0;
    const promises = lines.slice(1).map(line => {
      const cols = line.split(',');
      if (cols.length < 4) return Promise.resolve();
      const date = cols[0].trim(); const ot = parseFloat(cols[2]) || 0; const shift = parseFloat(cols[3]) || 0;
      const note = (cols[7] || '').replace(/"/g, '').trim();
      if (!/\d{4}-\d{2}-\d{2}/.test(date)) return Promise.resolve();
      return addOvertimeEntry(user.uid, { date, overtimeHours: ot, shiftHours: shift, note }).then(() => count++).catch(() => {});
    });
    Promise.all(promises).then(() => {
      setToast({ message: t('xEntriesImported', { n: count }), type: 'success' });
      setShowImportModal(false); setImportText('');
    });
  };

  // Feature #21: Load rate history
  const loadRateHistory = async () => {
    try {
      const history = await getRateChangeHistory(user.uid);
      setRateHistory(history);
      setShowRateHistory(true);
    } catch { setToast({ message: t('historyLoadFailed'), type: 'error' }); }
  };

  // Build calendar grid (cycle-aware)
  const calendarDays = getCycleCalendarDays(currentMonth, cycleDay);

  const getEntryForDay = (cd: CycleDay) => {
    return entries.find(e => e.date === cd.date);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Export data as CSV
  const handleExport = () => {
    if (entries.length === 0) return;
    const headers = `${t('csvDate')},${t('csvDay')},${t('csvOtHours')},${t('csvShiftHours')},${t('csvOtMoney')},${t('csvShiftMoney')},${t('csvTotalMoney')},${t('csvNote')}\n`;
    const rows = entries.sort((a, b) => a.date.localeCompare(b.date))
      .map(e => {
        const money = calcEntryMoney(e, hourlyRate, otRate);
        const dayIsSunday = isWeeklyHol(e.date);
        const dayName = dayIsSunday ? weeklyHolName : formatDate(e.date);
        return `${e.date},${dayName},${e.overtimeHours},${e.shiftHours},${money.otMoney},${money.shiftMoney},${money.total},"${e.note || ''}"`;
      })
      .join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overtime_${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: t('csvDownloaded'), type: 'success' });
  };

  // Dark mode class constants
  const card = cn('rounded-xl border shadow-sm', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100');
  const txt = cn(dark ? 'text-[#E0E0E0]' : 'text-gray-900');
  const txt2 = cn(dark ? 'text-gray-400' : 'text-gray-500');
  const bdr = dark ? 'border-gray-700' : 'border-gray-100';
  const hov = dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const divd = dark ? 'divide-gray-700' : 'divide-gray-50';
  const inputCls = cn('w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200');

  return (
    <div className={cn("min-h-screen pb-24", dark ? "bg-[#121212]" : "bg-[#F8F9FA]")}>
      {/* Header */}
      <header className={cn("border-b sticky top-0 z-30 safe-area-top", dark ? "bg-[#1E1E1E] border-gray-700" : "bg-white border-gray-200")}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden', siteConfig.siteLogo && 'p-0')}>
              {siteConfig.siteLogo ? <img src={siteConfig.siteLogo} alt="" className="w-full h-full object-cover" /> : 'OT'}
            </div>
            <div>
              <h1 className={cn("font-semibold text-sm", txt)}>{siteConfig.siteTitle || 'Overtime Tracker'}</h1>
              <p className={cn("text-xs", txt2)}>{profile.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* More menu button */}
            <div className="relative">
              <button
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className={cn("p-2 rounded-lg transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-400")}
              >
                <Icon name={BI.threeDots} className="text-lg" />
              </button>
              {showHeaderMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                  <div className={cn("absolute right-0 top-full mt-1 w-52 rounded-xl shadow-xl border z-50 overflow-hidden", dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
                    <button onClick={() => { setShowHeaderMenu(false); handleExport(); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-50 text-gray-700")}>
                      <Icon name={BI.download} className="text-emerald-600" /> {t('csvDownload')}
                    </button>
                    <button onClick={() => { setShowHeaderMenu(false); handleExcelExport(); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-50 text-gray-700")}>
                      <Icon name={BI.fileSpreadsheet} className="text-green-600" /> {t('excelDownload')}
                    </button>
                    <button onClick={() => { setShowHeaderMenu(false); openPrintWindow(generateMonthlyReportHTML({ entries, displayName: profile.displayName, email: profile.email, hourlyRate, otRate, monthKey: currentMonth })); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-50 text-gray-700")}>
                      <Icon name={BI.fileEarmarkPdf} className="text-red-600" /> {t('pdfReport')}
                    </button>
                    <button onClick={() => { setShowHeaderMenu(false); openPrintWindow(generateSalarySlipHTML({ entries, displayName: profile.displayName, email: profile.email, hourlyRate, otRate, monthKey: currentMonth })); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-50 text-gray-700")}>
                      <Icon name={BI.fileText} className="text-blue-600" /> {t('salarySlip')}
                    </button>

                    <div className={cn("border-t", dark ? "border-gray-700" : "border-gray-100")} />
                    <button onClick={() => { setShowHeaderMenu(false); setShowBulkModal(true); setBulkShiftHours(profile.dutyHours || 8); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-50 text-gray-700")}>
                      <Icon name={BI.layers} className="text-purple-600" /> {t('bulkEntry')}
                    </button>
                    <button onClick={() => { setShowHeaderMenu(false); setShowImportModal(true); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-50 text-gray-700")}>
                      <Icon name={BI.upload} className="text-blue-600" /> {t('importData')}
                    </button>
                    <button onClick={() => { setShowHeaderMenu(false); loadRateHistory(); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors", dark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-50 text-gray-700")}>
                      <Icon name={BI.history} className="text-gray-500" /> {t('rateHistory')}
                    </button>

                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Entry Lock Banner */}
      {isMonthLocked && (
        <div className={cn('border-b px-4 py-2', dark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200')}>
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <Icon name={BI.lock} className="text-amber-500 shrink-0" />
            <span className={cn('text-xs font-medium', dark ? 'text-amber-400' : 'text-amber-700')}>{t('monthLocked')}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* ====== 1. মোট বেতন ====== */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-xl p-4 mb-4 shadow-lg shadow-emerald-200/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-100 text-xs mb-1">
                <Icon name={BI.wallet2} className="text-sm" /> {t('totalSalary')}
              </div>
              <div className="text-3xl font-bold text-white">{formatTaka(summary.totalSalary)}</div>
              <div className="text-[11px] text-emerald-100 mt-1 space-x-2">
                <span>{t('shift')} {formatTaka(summary.shiftMoney)}</span>·
                <span>OT {formatTaka(summary.otMoney)}</span>·
                <span>{weeklyHolName} {formatTaka(summary.sundayMoney)}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon name={BI.wallet2} className="text-white text-2xl" />
            </div>
          </div>
        </div>

        {/* ====== 2. শিফট টাকা + OT টাকা ====== */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={cn(card, 'p-3.5')}>
            <div className={cn('flex items-center gap-2 text-xs mb-1', txt2)}>
              <Icon name={BI.cashCoin} className="text-emerald-600" /> {t('shiftMoney')}
            </div>
            <div className="text-xl font-bold text-emerald-600">{formatTaka(summary.shiftMoney)}</div>
            <div className="text-[10px] text-gray-400">{t('shiftHoursRate', { n: summary.nonSundayShiftHours, rate: formatTaka(hourlyRate) })}</div>
          </div>
          <div className={cn(card, 'p-3.5')}>
            <div className={cn('flex items-center gap-2 text-xs mb-1', txt2)}>
              <Icon name={BI.currencyExchange} className="text-teal-600" /> {t('otMoney')}
            </div>
            <div className={cn("text-xl font-bold", dark ? "text-teal-400" : "text-teal-600")}>{formatTaka(summary.otMoney)}</div>
            <div className="text-[10px] text-gray-400">{t('shiftHoursRate', { n: summary.nonSundayOTHours, rate: formatTaka(otRate) })}</div>
          </div>
        </div>

        {/* ====== 3. সাপ্তাহিক ছুটি টাকা + ঘণ্টা ====== */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={cn('rounded-xl p-3.5 border shadow-sm', dark ? 'bg-[#1E1E1E] border-orange-800' : 'bg-white border-orange-200')}>
            <div className="flex items-center gap-2 text-orange-500 text-xs mb-1">
              <Icon name={BI.cashStack} className="text-orange-500" /> {t('weeklyMoney', { name: weeklyHolName })}
            </div>
            <div className="text-xl font-bold text-orange-500">{formatTaka(summary.sundayMoney)}</div>
            <div className={cn('text-[10px]', dark ? 'text-orange-400' : 'text-orange-500')}>{t('weeklyHoursRate', { n: summary.sundayTotalHours, rate: formatTaka(hourlyRate) })}</div>
          </div>
          <div className={cn('rounded-xl p-3.5 border shadow-sm', dark ? 'bg-[#1E1E1E] border-orange-800' : 'bg-white border-orange-200')}>
            <div className="flex items-center gap-2 text-orange-500 text-xs mb-1">
              <Icon name={BI.calendarWeek} className="text-orange-500" /> {t('weeklyHours', { name: weeklyHolName })}
            </div>
            <div className="text-xl font-bold text-orange-500">{summary.sundayTotalHours}</div>
            <div className={cn('text-[10px]', dark ? 'text-orange-400' : 'text-orange-500')}>{t('shiftPlusOt', { s: summary.sundayShiftHours, o: summary.sundayOTHours })}</div>
          </div>
        </div>

        {/* ====== 4. মোট শিফট + মোট ওভারটাইম ====== */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={cn(card, 'p-3.5')}>
            <div className={cn('flex items-center gap-2 text-xs mb-1', txt2)}>
              <Icon name={BI.clipboardData} className="text-teal-600" /> {t('totalShift')}
            </div>
            <div className="text-2xl font-bold text-teal-600">{summary.totalShift}</div>
            <div className="text-xs text-gray-400">{t('hours')}</div>
          </div>
          <div className={cn(card, 'p-3.5')}>
            <div className={cn('flex items-center gap-2 text-xs mb-1', txt2)}>
              <Icon name={BI.clock} className="text-emerald-600" /> {t('totalOvertime')}
            </div>
            <div className="text-2xl font-bold text-emerald-600">{summary.totalOT}</div>
            <div className="text-xs text-gray-400">{t('hours')}</div>
          </div>
        </div>

        {/* ====== 5. Entries + Avg OT ====== */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={cn(card, 'p-3.5')}>
            <div className={cn('flex items-center gap-2 text-xs mb-1', txt2)}>
              <Icon name={BI.calendarCheck} className="text-blue-600" /> {t('entries')}
            </div>
            <div className={cn('text-2xl font-bold', txt)}>{entries.length}</div>
            <div className="text-xs text-gray-400">{t('days')}</div>
          </div>
          <div className={cn(card, 'p-3.5')}>
            <div className={cn('flex items-center gap-2 text-xs mb-1', txt2)}>
              <Icon name={BI.graphUp} className="text-amber-600" /> {t('avgOT')}
            </div>
            <div className="text-2xl font-bold text-amber-600">{summary.avgOT}</div>
            <div className="text-xs text-gray-400">{t('hoursDay')}</div>
          </div>
        </div>

        {/* ====== Analytics Section (Features #6-#10) ====== */}
        <div className={cn(card, 'mb-4')}>
          <div className={cn('flex overflow-x-auto border-b no-select px-1', bdr)}>
            {([
              { key: 'chart', label: t('chart'), icon: BI.barChart },
              { key: 'comparison', label: t('comparison'), icon: BI.graphUp },
              { key: 'weekly', label: t('weekly'), icon: BI.calendarWeek },
              { key: 'absent', label: t('absent'), icon: BI.calendarX },
              { key: 'yearly', label: t('yearly'), icon: BI.calendarRange },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setAnalysisTab(tab.key);
                  if (tab.key === 'comparison' || tab.key === 'yearly') {
                    loadAllEntries();
                  }
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 shrink-0',
                  analysisTab === tab.key
                    ? cn('border-emerald-600 text-emerald-700', dark ? 'bg-emerald-900/30' : 'bg-emerald-50/50')
                    : cn('border-transparent', txt2, 'hover:text-gray-700', hov)
                )}
              >
                <Icon name={tab.icon} className="text-sm" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Feature #6: Doughnut Chart */}
            {analysisTab === 'chart' && (() => {
              const chartItems = [
                { label: t('shiftBreakdown'), value: summary.shiftMoney, color: '#10b981', hours: summary.nonSundayShiftHours, rate: formatTaka(hourlyRate) },
                { label: 'OT', value: summary.otMoney, color: '#14b8a6', hours: summary.nonSundayOTHours, rate: formatTaka(otRate) },
                { label: weeklyHolName, value: summary.sundayMoney, color: '#f97316', hours: summary.sundayTotalHours, rate: formatTaka(hourlyRate) + ' x2' },
              ];
              const doughnutData = {
                labels: chartItems.map(d => d.label),
                datasets: [{
                  data: chartItems.map(d => d.value),
                  backgroundColor: chartItems.map(d => d.color),
                  borderWidth: 2,
                  borderColor: dark ? '#1E1E1E' : '#FFFFFF',
                }],
              };
              const doughnutOptions = {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom' as const,
                    labels: {
                      color: dark ? '#E0E0E0' : '#212529',
                      font: { size: 12, weight: 'bold' as const },
                      padding: 16,
                      usePointStyle: true,
                      pointStyle: 'circle' as const,
                    },
                  },
                  title: {
                    display: true,
                    text: getMonthName(currentMonth) + t('incomePatternDash'),
                    color: dark ? '#E0E0E0' : '#212529',
                    font: { size: 14, weight: 'bold' as const },
                    padding: { bottom: 12 },
                  },
                  tooltip: {
                    backgroundColor: dark ? '#2A2A2A' : '#FFFFFF',
                    titleColor: dark ? '#E0E0E0' : '#212529',
                    bodyColor: dark ? '#E0E0E0' : '#212529',
                    borderColor: dark ? '#555' : '#ddd',
                    borderWidth: 1,
                    callbacks: {
                      label: (ctx: { label: string; parsed: number }) => {
                        return ctx.label + ': ' + formatTaka(ctx.parsed);
                      },
                    },
                  },
                },
                cutout: '55%',
              };
              return (
                <div className="w-full max-w-md mx-auto">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {chartItems.map(d => (
                      <div key={d.label + '-rate'} className={cn('text-center p-2 rounded-lg', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
                        <div className="text-[10px] text-gray-400">{t('rate')}</div>
                        <div className={cn('text-xs font-semibold', txt)}>{d.rate}{t('perHour')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Feature #7: Multi-month Comparison */}
            {analysisTab === 'comparison' && (() => {
              const [cy, cm] = currentMonth.split('-').map(Number);
              const prevMK = getCycleMonthKey(new Date(cy, cm - 2, 1), cycleDay);
              const prevEntries = allEntries.filter(e => {
                const { start, end } = getCycleRange(prevMK, cycleDay);
                return e.date >= start && e.date <= end;
              });
              const prevSum = calcMonthSummary(prevEntries, hourlyRate, otRate, weeklyHolidayDays);
              const calcChange = (cur: number, prev: number): string => {
                if (prev === 0) return cur > 0 ? '+100' : '0';
                const pct = ((cur - prev) / prev * 100).toFixed(1);
                return (pct.startsWith('-') ? '' : '+') + pct;
              };
              const items = [
                { label: t('totalSalary'), cur: summary.totalSalary, prev: prevSum.totalSalary, isMoney: true },
                { label: t('otHoursCol'), cur: summary.totalOT, prev: prevSum.totalOT },
                { label: t('shiftHoursCol'), cur: summary.totalShift, prev: prevSum.totalShift },
                { label: t('entries'), cur: entries.length, prev: prevEntries.length },
              ];
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-center">
                      <div className="text-[10px] text-gray-400">{t('prevMonth')}</div>
                      <div className="text-xs font-semibold text-gray-600">{getCycleMonthName(prevMK, cycleDay)}</div>
                    </div>
                    <div className="flex items-center gap-1 text-gray-300">
                      <Icon name={BI.arrowLeft} className="text-sm" />
                      <Icon name={BI.arrowRight} className="text-sm" />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-emerald-600 font-medium">{t('current')}</div>
                      <div className="text-xs font-bold text-emerald-700">{getMonthName(currentMonth)}</div>
                    </div>
                  </div>
                  {loadingAnalysis ? (
                    <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                  ) : (
                    <div className="space-y-2.5">
                      {items.map(item => {
                        const change = calcChange(item.cur, item.prev);
                        const isUp = item.cur > item.prev;
                        const isSame = item.cur === item.prev;
                        return (
                          <div key={item.label} className={cn('flex items-center justify-between p-3 rounded-xl', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
                            <div className={cn('text-sm font-medium', txt)}>{item.label}</div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs text-gray-400">{item.isMoney ? formatTaka(item.prev) : item.prev}</div>
                                <div className={cn('text-sm font-bold', txt)}>{item.isMoney ? formatTaka(item.cur) : item.cur}</div>
                              </div>
                              <span className={cn(
                                'text-xs font-bold px-2 py-1 rounded-lg min-w-[64px] text-center',
                                isSame ? (dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500') : isUp ? (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (dark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                              )}>
                                {isSame ? '=' : (isUp ? '\u2191 ' : '\u2193 ') + change + '%'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Feature #9: Weekly Summary */}
            {analysisTab === 'weekly' && (() => {
              const weeklyGroups: Record<number, OvertimeEntry[]> = {};
              entries.forEach(e => {
                const w = getWeekNumber(e.date);
                if (!weeklyGroups[w]) weeklyGroups[w] = [];
                weeklyGroups[w].push(e);
              });
              const weeks = Object.keys(weeklyGroups).map(Number).sort((a, b) => a - b);
              if (weeks.length === 0) return (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <Icon name={BI.calendarWeek} className="text-3xl mx-auto mb-2 opacity-30" />
                  {t('noEntryThisMonth')}
                </div>
              );
              return (
                <div className="space-y-3">
                  {weeks.map(w => {
                    const wEntries = weeklyGroups[w];
                    const wSum = calcMonthSummary(wEntries, hourlyRate, otRate, weeklyHolidayDays);
                    return (
                      <div key={w} className={cn('rounded-xl p-3', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn('text-sm font-bold', txt)}>{t('week')} {w}</span>
                          <span className="text-xs font-bold text-emerald-700">{formatTaka(wSum.totalSalary)}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center">
                            <div className="text-[10px] text-gray-400">{t('days')}</div>
                            <div className="text-sm font-bold text-gray-800">{wEntries.length}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-gray-400">Shift</div>
                            <div className="text-sm font-bold text-teal-600">{wSum.totalShift}h</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-gray-400">OT</div>
                            <div className="text-sm font-bold text-emerald-600">{wSum.totalOT}h</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-gray-400">{t('holiday')}</div>
                            <div className="text-sm font-bold text-orange-600">{wSum.sundayTotalHours}h</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Feature #10: Absent Days */}
            {analysisTab === 'absent' && (() => {
              const [ay, am] = currentMonth.split('-').map(Number);
              const absent = getAbsentDaysForCycle(entries, currentMonth, cycleDay, weeklyHolidayDays);
              return (
                <div>
                  {absent.length === 0 ? (
                    <div className="text-center py-8">
                      <Icon name={BI.checkCircle} className="text-4xl text-emerald-300 mx-auto mb-2" />
                      <p className="text-emerald-600 font-medium text-sm">{t('allDaysWorked')}</p>
                      <p className="text-xs text-gray-400 mt-1">{t('holidayExcluded', { name: weeklyHolName })}</p>
                    </div>
                  ) : (
                    <div>
                      <div className={cn('flex items-center gap-2 mb-3 p-2.5 rounded-xl border', dark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100')}>
                        <Icon name={BI.calendarX} className="text-red-500" />
                        <span className={cn('text-sm font-medium', dark ? 'text-red-400' : 'text-red-700')}>{t('xDaysAbsent', { n: absent.length })}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {absent.map(d => (
                          <div key={d} className={cn('border rounded-lg p-2 text-center', dark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100')}>
                            <div className={cn('text-xs font-bold', dark ? 'text-red-400' : 'text-red-700')}>{formatDate(d)}</div>
                            <div className="text-[10px] text-red-400">{d}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Feature #8: Annual Summary */}
            {analysisTab === 'yearly' && (() => {
              if (loadingAnalysis) return <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>;
              const yearEntries = allEntries.filter(e => e.date.startsWith(String(selectedYear)));
              const yearSum = calcMonthSummary(yearEntries, hourlyRate, otRate, weeklyHolidayDays);
              const monthData: { key: string; sum: ReturnType<typeof calcMonthSummary>; count: number }[] = [];
              for (let m = 1; m <= 12; m++) {
                const mk = `${selectedYear}-${String(m).padStart(2, '0')}`;
                const mEntries = yearEntries.filter(e => e.date.startsWith(mk));
                monthData.push({ key: mk, sum: calcMonthSummary(mEntries, hourlyRate, otRate, weeklyHolidayDays), count: mEntries.length });
              }
              return (
                <div>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button onClick={() => setSelectedYear(selectedYear - 1)} className={cn('p-2 rounded-lg active:scale-95 transition-colors', hov)}>
                      <Icon name={BI.chevronLeft} />
                    </button>
                    <span className={cn('text-lg font-bold', txt)}>{selectedYear}</span>
                    <button onClick={() => setSelectedYear(selectedYear + 1)} className={cn('p-2 rounded-lg active:scale-95 transition-colors', hov)}>
                      <Icon name={BI.chevronRight} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className={cn('rounded-xl p-3 text-center', dark ? 'bg-emerald-900/20' : 'bg-emerald-50')}>
                      <div className="text-[10px] text-emerald-600">{t('totalSalary2')}</div>
                      <div className="text-lg font-bold text-emerald-700">{formatTaka(yearSum.totalSalary)}</div>
                    </div>
                    <div className={cn('rounded-xl p-3 text-center', dark ? 'bg-teal-900/20' : 'bg-teal-50')}>
                      <div className="text-[10px] text-teal-600">{t('totalHours')}</div>
                      <div className="text-lg font-bold text-teal-700">{yearSum.totalShift + yearSum.totalOT}h</div>
                    </div>
                    <div className={cn('rounded-xl p-3 text-center', dark ? 'bg-orange-900/20' : 'bg-orange-50')}>
                      <div className="text-[10px] text-orange-600">{t('weeklyHours', { name: weeklyHolName })}</div>
                      <div className="text-lg font-bold text-orange-700">{yearSum.sundayTotalHours}h</div>
                    </div>
                    <div className={cn('rounded-xl p-3 text-center', dark ? 'bg-blue-900/20' : 'bg-blue-50')}>
                      <div className="text-[10px] text-blue-600">{t('totalEntries')}</div>
                      <div className="text-lg font-bold text-blue-700">{yearEntries.length}</div>
                    </div>
                  </div>

                  <div className="w-full max-w-md mx-auto">
                    {(() => {
                      const yearChartData = {
                        labels: monthData.map(md => getMonthName(md.key).split(' ')[0]),
                        datasets: [{
                          data: monthData.map(md => md.sum.totalSalary),
                          backgroundColor: [
                            '#b91d47', '#00aba9', '#2b5797', '#e8c3b9', '#1e7145',
                            '#f97316', '#10b981', '#14b8a6', '#8b5cf6', '#ec4899',
                            '#eab308', '#06b6d4',
                          ],
                          borderWidth: 2,
                          borderColor: dark ? '#1E1E1E' : '#FFFFFF',
                        }],
                      };
                      const yearChartOptions = {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'bottom' as const,
                            labels: {
                              color: dark ? '#E0E0E0' : '#212529',
                              font: { size: 10, weight: 'bold' as const },
                              padding: 8,
                              usePointStyle: true,
                              pointStyle: 'circle' as const,
                            },
                          },
                          title: {
                            display: true,
                            text: selectedYear + t('monthlySalaryPattern'),
                            color: dark ? '#E0E0E0' : '#212529',
                            font: { size: 14, weight: 'bold' as const },
                            padding: { bottom: 12 },
                          },
                          tooltip: {
                            backgroundColor: dark ? '#2A2A2A' : '#FFFFFF',
                            titleColor: dark ? '#E0E0E0' : '#212529',
                            bodyColor: dark ? '#E0E0E0' : '#212529',
                            borderColor: dark ? '#555' : '#ddd',
                            borderWidth: 1,
                            callbacks: {
                              label: (ctx: { label: string; parsed: number }) => {
                                return ctx.label + ': ' + formatTaka(ctx.parsed);
                              },
                            },
                          },
                        },
                        cutout: '45%',
                      };
                      return <Doughnut data={yearChartData} options={yearChartOptions} />;
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ====== Calendar ====== */}
        <div className={cn(card, 'mb-4')}>
          <div className={cn('flex items-center justify-between p-3 border-b', bdr)}>
            <button onClick={() => navigateMonth(-1)} className={cn('p-2 rounded-lg transition-colors active:scale-95', hov)}>
              <Icon name={BI.chevronLeft} className="text-lg" />
            </button>
            <h2 className={cn('font-semibold text-sm', txt)}>{getCycleMonthName(currentMonth, cycleDay)}</h2>
            <button onClick={() => navigateMonth(1)} className={cn('p-2 rounded-lg transition-colors active:scale-95', hov)}>
              <Icon name={BI.chevronRight} className="text-lg" />
            </button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((d, idx) => (
                <div key={d} className={cn('text-center text-[10px] font-medium py-1', weeklyHolidayDays.includes(idx) ? 'text-orange-500 font-bold' : 'text-gray-400')}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cd, idx) => {
                if (!cd) return <div key={`empty-${idx}`} className="min-h-[64px]" />;
                const entry = getEntryForDay(cd);
                const isToday = cd.date === todayStr;
                const dayIsSunday = isWeeklyHol(cd.date);

                return (
                  <div
                    key={cd.date}
                    onClick={() => {
                      if (isMonthLocked) return;
                      if (entry) {
                        handleEdit(entry);
                      } else {
                        setSelectedDate(cd.date);
                        setOtHours(0);
                        setShiftHours(profile.dutyHours || 8);
                        setNote('');
                        setEditEntry(null);
                        setShowAdd(true);
                      }
                    }}
                    className={cn(
                      'cal-cell min-h-[64px] p-1.5 rounded-lg border cursor-pointer transition-all no-select',
                      isToday ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-gray-100 hover:border-gray-200',
                      entry ? 'bg-emerald-50/70 border-emerald-200' : '',
                      dayIsSunday && !entry ? 'bg-orange-50/50 border-orange-200' : '',
                    )}
                  >
                    <div className={cn(
                      'text-xs font-medium mb-0.5 flex items-center justify-between',
                      isToday ? 'text-emerald-700 font-bold' : dayIsSunday ? 'text-orange-600' : 'text-gray-600',
                    )}>
                      <span>{cd.monthLabel ? `${cd.day} ${cd.monthLabel}` : cd.day}</span>
                      {dayIsSunday && <span className="text-[8px] leading-none">{t('holiday')}</span>}
                    {!dayIsSunday && (() => { const hd = customHolidays.find(h => h.date === cd.date); return hd ? <span className="text-[7px] leading-none text-amber-500">{hd.name.charAt(0)}</span> : null; })()}
                    </div>
                    {entry && (
                      <div className="space-y-0.5">
                        <div className={cn('text-[9px] leading-tight px-1 py-0.5 rounded font-medium', dayIsSunday ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700')}>
                          OT:{entry.overtimeHours}h
                        </div>
                        <div className="text-[9px] leading-tight bg-teal-100 text-teal-700 px-1 py-0.5 rounded font-medium">
                          S:{entry.shiftHours}h
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ====== Entries List ====== */}
        <div className={card}>
          <div className={cn('p-3 border-b flex items-center justify-between', bdr)}>
            <h3 className={cn('font-semibold text-sm flex items-center gap-2', txt)}>
              <Icon name={BI.journalText} className="text-emerald-600" /> {t('thisMonthEntries')}
            </h3>
            <span className="text-xs text-gray-400">{t('xDays', { n: entries.length })}</span>
          </div>
          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name={BI.calendarCheck} className="text-4xl text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">{t('noEntryThisMonth')}</p>
              <p className="text-xs text-gray-300 mt-1">{t('tapToAddEntry')}</p>
            </div>
          ) : (
            <div className={cn('divide-y', divd)}>
              {entries.sort((a, b) => a.date.localeCompare(b.date)).map(entry => {
                const entryIsSunday = isWeeklyHol(entry.date);
                const money = calcEntryMoney(entry, hourlyRate, otRate);

                return (
                  <div key={entry.id} className={cn('flex items-center justify-between px-3 py-2.5 active:bg-gray-50', dark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50')}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-center min-w-[40px]">
                        <div className="text-xs font-bold text-gray-800">{formatDate(entry.date)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full', entryIsSunday ? (dark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700') : (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'))}>
                            OT: {entry.overtimeHours}h
                          </span>
                          <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full', dark ? 'bg-teal-900/30 text-teal-300' : 'bg-teal-100 text-teal-700')}>
                            S: {entry.shiftHours}h
                          </span>
                          {entryIsSunday && (
                            <span className={cn('inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full', dark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-600')}>
                              {t('x2Double')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500 font-medium">{formatTaka(money.total)}</span>
                          {entryIsSunday ? (
                            <span className="text-[10px] text-orange-500">({entry.shiftHours}+{entry.overtimeHours})×2×{formatTaka(hourlyRate)}</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">S:{formatTaka(money.shiftMoney)} OT:{formatTaka(money.otMoney)}</span>
                          )}
                        </div>
                        {entry.note && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{entry.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isMonthLocked && (
                        <>
                        <button onClick={() => handleEdit(entry)} className={cn('p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors active:scale-95', hov)}>
                          <Icon name={BI.pencil} className="text-sm" />
                        </button>
                        <button onClick={() => { setCopySourceEntry(entry); setCopyTargetDate(''); setShowCopyModal(true); }} className={cn('p-1.5 rounded-lg text-gray-400 hover:text-blue-600 transition-colors active:scale-95', hov)} title="Copy">
                          <Icon name={BI.copy} className="text-sm" />
                        </button>
                        <button onClick={() => handleDelete(entry)} className={cn('p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition-colors active:scale-95', hov)}>
                          <Icon name={BI.trash} className="text-sm" />
                        </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => { setShowAdd(false); setEditEntry(null); }}>
          <div className={cn('rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl safe-area-bottom max-h-[90vh] overflow-y-auto', dark ? 'bg-[#1E1E1E]' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className={cn('p-4 border-b', bdr)}>
              <h3 className={cn('font-semibold', txt)}>{editEntry ? t('editEntry') : t('newEntry')}</h3>
              <p className={cn('text-sm mt-0.5', txt2)}>{t('dateLabel')} {selectedDate}</p>
            </div>

            {/* Special Day Banner (Sunday / Holiday) */}
            {selectedDateIsSunday && (
              <div className="mx-4 mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={BI.calendarWeek} className="text-orange-500 text-lg shrink-0" />
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">{t('doubleRateAll', { name: weeklyHolName })}</span>
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400 ml-7">
                  {t('doubleRateDesc', { rate: formatTaka(hourlyRate) })}
                </div>
              </div>
            )}
            {!selectedDateIsSunday && selectedDateHoliday.isHoliday && (
              <div className="mx-4 mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={BI.umbrella} className="text-amber-500 text-lg shrink-0" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t('holidayRateCalc', { name: selectedDateHoliday.name, rate: selectedDateHoliday.rate })}</span>
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 ml-7">
                  {t('holidayRateDesc', { rate: selectedDateHoliday.rate, hourlyRate: formatTaka(hourlyRate) })}
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {!editEntry && (
                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('date')}</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
              {/* Feature #20: Shift Start/End with meal break */}
              {!editEntry && (
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className={cn('block text-xs font-medium mb-1', txt2)}>{t('shiftStart')}</label>
                    <input type="time" value={shiftStart} onChange={(e) => handleShiftTimeChange(e.target.value, shiftEnd)} className={cn('w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0]' : 'border-gray-200')} />
                  </div>
                  <div>
                    <label className={cn('block text-xs font-medium mb-1', txt2)}>{t('shiftEnd')}</label>
                    <input type="time" value={shiftEnd} onChange={(e) => handleShiftTimeChange(shiftStart, e.target.value)} className={cn('w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0]' : 'border-gray-200')} />
                  </div>
                  {shiftStart && shiftEnd && mealBreakHours > 0 && (
                    <div className={cn('col-span-2 text-[10px] text-gray-400 rounded-lg px-2 py-1.5', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
                      {t('mealBreakCalc', { total: (() => { const [sh,sm]=shiftStart.split(':').map(Number); const [eh,em]=shiftEnd.split(':').map(Number); let d=(eh*60+em)-(sh*60+sm); if(d<0) d+=24*60; return (d/60).toFixed(1); })(), brk: mealBreakHours, work: shiftHours })}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>
                    {t('otHoursLabel')}
                    {selectedDateIsSunday && <span className="text-orange-500 text-xs ml-1">{t('x2Basic')}</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={otHours}
                    onChange={(e) => setOtHours(parseFloat(e.target.value) || 0)}
                    className={cn(inputCls, 'text-center text-lg font-semibold')}
                  />
                  {otHours > 0 && (
                    <div className="text-[10px] text-gray-400 mt-1 text-center">
                      = {formatTaka(selectedDateSpecial ? otHours * selectedDateRate * hourlyRate : otHours * otRate)}
                      {selectedDateSpecial && <span className="text-orange-500"> ({otHours}×{selectedDateRate}×{formatTaka(hourlyRate)})</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>
                    {t('shiftHoursLabel')}
                    {selectedDateIsSunday && <span className="text-orange-500 text-xs ml-1">{t('x2Basic')}</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={shiftHours}
                    onChange={(e) => setShiftHours(parseFloat(e.target.value) || 0)}
                    className={cn(inputCls.replace('focus:ring-emerald-500', 'focus:ring-teal-500'), 'text-center text-lg font-semibold')}
                  />
                  {shiftHours > 0 && (
                    <div className="text-[10px] text-gray-400 mt-1 text-center">
                      = {formatTaka(selectedDateSpecial ? shiftHours * selectedDateRate * hourlyRate : shiftHours * hourlyRate)}
                      {selectedDateSpecial && !selectedDateIsSunday && <span className="text-amber-500"> ({shiftHours}×{selectedDateRate}×{formatTaka(hourlyRate)})</span>}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={cn('block text-sm font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('noteOptional')}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={cn('w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')}
                  rows={2}
                  placeholder={t('notePlaceholder')}
                />
              </div>
            </div>
            <div className={cn('p-4 border-t flex gap-3', bdr)}>
              <button
                onClick={() => { setShowAdd(false); setEditEntry(null); }}
                className={cn('flex-1 py-2.5 rounded-xl border font-medium transition-all active:scale-[0.98]', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? <LoadingSpinner size="sm" /> : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {!showAdd && !isMonthLocked && (
        <button
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setSelectedDate(today);
            setOtHours(0);
            setShiftHours(profile.dutyHours || 8);
            setNote('');
            setEditEntry(null);
            setShowAdd(true);
          }}
          className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center z-20 active:scale-95"
        >
          <Icon name={BI.plus} className="text-xl" />
        </button>
      )}

      {/* ====== Copy Entry Modal (Feature #18) ====== */}
      {showCopyModal && copySourceEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCopyModal(false)}>
          <div className={cn('rounded-2xl w-full max-w-sm shadow-2xl p-5', dark ? 'bg-[#1E1E1E]' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Icon name={BI.copy} className="text-blue-600" />
              <h3 className={cn('font-semibold', txt)}>{t('copyEntry')}</h3>
            </div>
            <div className={cn('text-xs mb-3 rounded-lg p-2', txt2, dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
              {t('source')}: {formatDate(copySourceEntry.date)} | OT: {copySourceEntry.overtimeHours}h | S: {copySourceEntry.shiftHours}h
            </div>
            <div className="mb-4">
              <label className={cn('block text-sm font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('newDate')}</label>
              <input type="date" value={copyTargetDate} onChange={(e) => setCopyTargetDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCopyModal(false)} className={cn('flex-1 py-2.5 rounded-xl border font-medium', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{t('cancel')}</button>
              <button onClick={handleCopyEntry} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? <LoadingSpinner size="sm" /> : t('copy')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Bulk Entry Modal (Feature #19) ====== */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowBulkModal(false)}>
          <div className={cn('rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto', dark ? 'bg-[#1E1E1E]' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            <div className={cn('p-4 border-b flex items-center gap-2', bdr)}>
              <Icon name={BI.layers} className="text-purple-600" />
              <h3 className={cn('font-semibold', txt)}>{t('bulkEntry')}</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={cn('block text-xs font-medium mb-1', txt2)}>{t('startDate')}</label><input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} className={cn('w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0]' : 'border-gray-200')} /></div>
                <div><label className={cn('block text-xs font-medium mb-1', txt2)}>{t('endDate')}</label><input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} className={cn('w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0]' : 'border-gray-200')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={cn('block text-xs font-medium mb-1', txt2)}>{t('otHoursField')}</label><input type="number" min="0" max="24" step="0.5" value={bulkOtHours} onChange={(e) => setBulkOtHours(parseFloat(e.target.value) || 0)} className={cn('w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-center', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0]' : 'border-gray-200')} /></div>
                <div><label className={cn('block text-xs font-medium mb-1', txt2)}>{t('shiftHoursField')}</label><input type="number" min="0" max="24" step="0.5" value={bulkShiftHours} onChange={(e) => setBulkShiftHours(parseFloat(e.target.value) || 0)} className={cn('w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-center', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0]' : 'border-gray-200')} /></div>
              </div>
              <div><label className={cn('block text-xs font-medium mb-1', txt2)}>{t('noteOptional')}</label><input type="text" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} className={cn('w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder={t('notePlaceholder2')} /></div>
              <label className={cn('flex items-center gap-2 text-xs', txt2)}><input type="checkbox" checked={bulkSkipHolidays} onChange={(e) => setBulkSkipHolidays(e.target.checked)} className="rounded" />{t('skipHoliday', { name: weeklyHolName })}</label>
            </div>
            <div className={cn('p-4 border-t flex gap-3', bdr)}>
              <button onClick={() => setShowBulkModal(false)} className={cn('flex-1 py-2.5 rounded-xl border font-medium', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{t('cancel')}</button>
              <button onClick={handleBulkCreate} disabled={bulkLoading} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50">{bulkLoading ? <LoadingSpinner size="sm" /> : t('add')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Import Modal (Feature #24) ====== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
          <div className={cn('rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto', dark ? 'bg-[#1E1E1E]' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            <div className={cn('p-4 border-b flex items-center gap-2', bdr)}><Icon name={BI.upload} className="text-blue-600" /><h3 className={cn('font-semibold', txt)}>{t('csvImport')}</h3></div>
            <div className="p-4">
              <p className={cn('text-xs mb-2', txt2)}>{t('csvPasteInstruction')}</p>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} className={cn('w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-xs', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} rows={8} placeholder={t('importPlaceholder')} />
            </div>
            <div className={cn('p-4 border-t flex gap-3', bdr)}>
              <button onClick={() => setShowImportModal(false)} className={cn('flex-1 py-2.5 rounded-xl border font-medium', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{t('cancel')}</button>
              <button onClick={handleImport} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700">{t('importBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Rate History Modal (Feature #21) ====== */}
      {showRateHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRateHistory(false)}>
          <div className={cn('rounded-2xl w-full max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto', dark ? 'bg-[#1E1E1E]' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            <div className={cn('p-4 border-b flex items-center justify-between', bdr)}>
              <div className="flex items-center gap-2"><Icon name={BI.history} className={cn('text-sm', txt2)} /><h3 className={cn('font-semibold', txt)}>{t('rateChangeHistory')}</h3></div>
              <button onClick={() => setShowRateHistory(false)} className={cn('p-1 rounded-lg text-gray-400', hov)}><Icon name={BI.xLg} className="text-sm" /></button>
            </div>
            <div className="p-4">
              {rateHistory.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">{t('noRateChange')}</p>
              ) : (
                <div className="space-y-2">
                  {rateHistory.map(log => (
                    <div key={log.id} className={cn('rounded-lg p-3 text-xs', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('font-medium px-2 py-0.5 rounded-full', log.field === 'hourlyRate' ? (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (dark ? 'bg-teal-900/30 text-teal-300' : 'bg-teal-100 text-teal-700'))}>{log.field === 'hourlyRate' ? t('basicRate') : t('otRate')}</span>
                        <span className="text-gray-400">{log.changedAt.split('T')[0]}</span>
                      </div>
                      <div className={cn('', txt)}>{formatTaka(log.oldValue)} → {formatTaka(log.newValue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmAction && <ConfirmDialog message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} dark={dark} />}
    </div>
  );
}



// ==================== USER GUIDE PAGE ====================

function UserGuidePage({ dark, onBack }: { dark: boolean; onBack: () => void }) {
  const t = useT();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const card = cn('rounded-xl border shadow-sm overflow-hidden', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100');
  const txt = cn(dark ? 'text-[#E0E0E0]' : 'text-gray-900');
  const desc = cn(dark ? 'text-gray-400' : 'text-gray-500');
  const bg = dark ? 'bg-[#121212]' : 'bg-[#F8F9FA]';

  interface GuideSection {
    icon: string; iconColor: string; title: string; items: { sub: string; detail: string; tip?: string }[];
  }

  const sections: GuideSection[] = [
    {
      icon: BI.house, iconColor: 'text-emerald-500', title: t('guide_s1_title'),
      items: [
        { sub: t('guide_s1_item1_sub'), detail: t('guide_s1_item1_detail') },
        { sub: t('guide_s1_item2_sub'), detail: t('guide_s1_item2_detail'), tip: t('guide_s1_item2_tip') },
        { sub: t('guide_s1_item3_sub'), detail: t('guide_s1_item3_detail') },
        { sub: t('guide_s1_item4_sub'), detail: t('guide_s1_item4_detail') },
      ],
    },
    {
      icon: BI.calculator, iconColor: 'text-teal-500', title: t('guide_s2_title'),
      items: [
        { sub: t('guide_s2_item1_sub'), detail: t('guide_s2_item1_detail'), tip: t('guide_s2_item1_tip') },
        { sub: t('guide_s2_item2_sub'), detail: t('guide_s2_item2_detail') },
        { sub: t('guide_s2_item3_sub'), detail: t('guide_s2_item3_detail') },
        { sub: t('guide_s2_item4_sub'), detail: t('guide_s2_item4_detail') },
      ],
    },
    {
      icon: BI.download, iconColor: 'text-blue-500', title: t('guide_s3_title'),
      items: [
        { sub: t('guide_s3_item1_sub'), detail: t('guide_s3_item1_detail') },
        { sub: t('guide_s3_item2_sub'), detail: t('guide_s3_item2_detail') },
        { sub: t('guide_s3_item3_sub'), detail: t('guide_s3_item3_detail') },
        { sub: t('guide_s3_item4_sub'), detail: t('guide_s3_item4_detail') },
        { sub: t('guide_s3_item5_sub'), detail: t('guide_s3_item5_detail'), tip: t('guide_s3_item5_tip') },
        { sub: t('guide_s3_item6_sub'), detail: t('guide_s3_item6_detail') },
      ],
    },
    {
      icon: BI.gear, iconColor: 'text-purple-500', title: t('guide_s4_title'),
      items: [
        { sub: t('guide_s4_item1_sub'), detail: t('guide_s4_item1_detail') },
        { sub: t('guide_s4_item2_sub'), detail: t('guide_s4_item2_detail') },
        { sub: t('guide_s4_item3_sub'), detail: t('guide_s4_item3_detail') },
        { sub: t('guide_s4_item4_sub'), detail: t('guide_s4_item4_detail') },
        { sub: t('guide_s4_item5_sub'), detail: t('guide_s4_item5_detail'), tip: t('guide_s4_item5_tip') },
        { sub: t('guide_s4_item6_sub'), detail: t('guide_s4_item6_detail') },
        { sub: t('guide_s4_item7_sub'), detail: t('guide_s4_item7_detail') },
        { sub: t('guide_s4_item8_sub'), detail: t('guide_s4_item8_detail') },
        { sub: t('guide_s4_item9_sub'), detail: t('guide_s4_item9_detail') },
      ],
    },
    {
      icon: BI.personBadge, iconColor: 'text-amber-500', title: t('guide_s5_title'),
      items: [
        { sub: t('guide_s5_item1_sub'), detail: t('guide_s5_item1_detail') },
        { sub: t('guide_s5_item2_sub'), detail: t('guide_s5_item2_detail') },
        { sub: t('guide_s5_item3_sub'), detail: t('guide_s5_item3_detail') },
        { sub: t('guide_s5_item4_sub'), detail: t('guide_s5_item4_detail') },
      ],
    },
    {
      icon: BI.shieldCheck, iconColor: 'text-red-400', title: t('guide_s6_title'),
      items: [
        { sub: t('guide_s6_item1_sub'), detail: t('guide_s6_item1_detail') },
        { sub: t('guide_s6_item2_sub'), detail: t('guide_s6_item2_detail') },
        { sub: t('guide_s6_item3_sub'), detail: t('guide_s6_item3_detail') },
        { sub: t('guide_s6_item4_sub'), detail: t('guide_s6_item4_detail') },
        { sub: t('guide_s6_item5_sub'), detail: t('guide_s6_item5_detail') },
        { sub: t('guide_s6_item6_sub'), detail: t('guide_s6_item6_detail') },
        { sub: t('guide_s6_item7_sub'), detail: t('guide_s6_item7_detail') },
      ],
    },
    {
      icon: BI.lightbulb, iconColor: 'text-yellow-400', title: t('guide_s7_title'),
      items: [
        { sub: t('guide_s7_item1_sub'), detail: t('guide_s7_item1_detail'), tip: t('guide_s7_item1_tip') },
        { sub: t('guide_s7_item2_sub'), detail: t('guide_s7_item2_detail') },
        { sub: t('guide_s7_item3_sub'), detail: t('guide_s7_item3_detail') },
        { sub: t('guide_s7_item4_sub'), detail: t('guide_s7_item4_detail') },
      ],
    },
  ];

  return (
    <div className={cn('min-h-screen pb-24', bg)}>
      <header className={cn('border-b sticky top-0 z-30 safe-area-top', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-200')}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className={cn('p-2 rounded-lg transition-colors', dark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500')}>
            <Icon name={BI.arrowLeft} className="text-lg" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Icon name={BI.book} className="text-white text-sm" />
            </div>
            <h1 className={cn('font-semibold text-sm', txt)}>{t('guide_header')}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Hero Card */}
        <div className={cn('rounded-2xl p-5 text-center', dark ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border border-emerald-800/50' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200')}>
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Icon name={BI.chatSquareText} className="text-white text-2xl" />
          </div>
          <h2 className={cn('font-bold text-lg mb-1', txt)}>{t('guide_title')}</h2>
          <p className={cn('text-sm', desc)}>{t('guide_desc')}</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600"><Icon name={BI.check2All} /> {t('guide_feat1')}</div>
            <div className="flex items-center gap-1.5 text-xs text-teal-600"><Icon name={BI.grid3x3} /> {t('guide_feat2')}</div>
          </div>
        </div>

        {/* Accordion Sections */}
        {sections.map((section, idx) => (
          <div key={idx} className={card}>
            <button
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', dark ? 'bg-gray-800' : 'bg-gray-50')}>
                <Icon name={section.icon} className={cn('text-lg', section.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn('font-semibold text-sm', txt)}>{section.title}</h3>
                <p className={cn('text-xs', desc)}>{t('guide_topics', { n: section.items.length })}</p>
              </div>
              <Icon name={expandedIdx === idx ? BI.chevronUp : BI.chevronDown} className={cn('text-gray-400 shrink-0 transition-transform', expandedIdx === idx && 'rotate-180')} />
            </button>
            {expandedIdx === idx && (
              <div className={cn('border-t px-4 pb-4 pt-3 space-y-3', dark ? 'border-gray-700' : 'border-gray-100')}>
                {section.items.map((item, i) => (
                  <div key={i} className={cn('rounded-xl p-3', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <h4 className={cn('font-semibold text-xs mb-1', txt)}>{item.sub}</h4>
                        <p className={cn('text-xs leading-relaxed', desc)}>{item.detail}</p>
                        {item.tip && (
                          <div className={cn('mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2', dark ? 'bg-amber-900/20 border border-amber-800/40' : 'bg-amber-50 border border-amber-200')}>
                            <Icon name={BI.lightbulb} className="text-amber-500 shrink-0 mt-0.5" />
                            <span className={cn('text-[11px]', dark ? 'text-amber-300' : 'text-amber-700')}>{item.tip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer Tip */}
        <div className={cn('rounded-2xl p-4 text-center', dark ? 'bg-emerald-900/20 border border-emerald-800/40' : 'bg-emerald-50 border border-emerald-200')}>
          <p className={cn('text-xs', desc)}>
            <Icon name={BI.infoCircle} className="text-emerald-500" /> {t('guide_footer')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== PROFILE SECTION =====================
function ProfileSection({ user, profile, dark, siteConfig, onShowGuide }: { user: { uid: string; email?: string | null }; profile: UserProfile; dark: boolean; siteConfig: SiteConfig; onShowGuide: () => void }) {
  const t = useT();
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [imgbbKey, setImgbbKey] = useState('');

  useEffect(() => {
    const unsub = subscribeAppConfig((config) => {
      setImgbbKey(config?.imgbbApiKey || '');
    });
    return unsub;
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setToast({ message: t('photoSizeError'), type: 'error' }); return; }
    setUploadingPhoto(true);
    try {
      let photoURL: string | null = null;
      let method = 'base64';

      // ImgBB আপলোড চেষ্টা — ব্যর্থ হলে Base64 তে ফলব্যাক
      if (imgbbKey.trim()) {
        try {
          const resized = await resizeImage(file, 400);
          const url = await uploadToImgBB(resized, imgbbKey.trim());
          photoURL = url;
          method = 'imgbb';
        } catch (imgErr) {
          console.warn('[PhotoUpload] ImgBB ব্যর্থ, Base64 ফলব্যাক ব্যবহার হচ্ছে:', imgErr);
        }
      }

      // ImgBB না থাকলে বা ব্যর্থ হলে Base64 ব্যবহার করুন
      if (!photoURL) {
        const resized = await resizeImage(file, 200);
        photoURL = resized;
        method = 'base64';
      }

      await updateUserProfile(user.uid, { photoURL });
      setToast({
        message: method === 'imgbb' ? t('photoUploaded') : t('photoSavedBase64'),
        type: 'success',
      });
    } catch (err) {
      console.error('[PhotoUpload] ত্রুটি:', err);
      setToast({ message: t('photoUploadError') + (err instanceof Error ? ': ' + err.message : ': ' + t('unknownError')), type: 'error' });
    }
    setUploadingPhoto(false);
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      setToast({ message: t('nameUpdated'), type: 'success' });
    } catch {
      setToast({ message: t('nameUpdateFailed'), type: 'error' });
    }
    setSavingName(false);
  };

  const handleSendResetEmail = async () => {
    if (!user.email) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      setToast({ message: t('resetEmailSent'), type: 'success' });
    } catch {
      setToast({ message: t('resetEmailFailed'), type: 'error' });
    }
    setResetLoading(false);
  };

  useEffect(() => { setDisplayName(profile.displayName || ''); }, [profile.displayName]);

  const initials = profile.displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={cn('min-h-screen pb-24', dark ? 'bg-[#121212]' : 'bg-[#F8F9FA]')}>
      <header className={cn('border-b sticky top-0 z-30 safe-area-top', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-200')}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className={cn('w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden', siteConfig.siteLogo && 'p-0')}><div style={{display:'contents'}}>{siteConfig.siteLogo ? <img src={siteConfig.siteLogo} alt="" className="w-full h-full object-cover" /> : 'OT'}</div></div>
          <h1 className={cn('font-semibold text-sm', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{t('profile')}</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Avatar Card */}
        <div className={cn('rounded-xl border shadow-sm p-6 text-center', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
          <div className="relative inline-block">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className={cn('w-24 h-24 rounded-full object-cover mx-auto border-4', dark ? 'border-emerald-800' : 'border-emerald-100')} />
            ) : (
              <div className={cn('w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl mx-auto border-4', dark ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200')}>
                {initials}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors shadow-lg">
              {uploadingPhoto ? <LoadingSpinner size="sm" /> : <Icon name={BI.camera} className="text-sm" />}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div className="mt-3">
            <h2 className={cn('font-bold text-lg', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{profile.displayName}</h2>
            <p className={cn('text-sm', dark ? 'text-gray-400' : 'text-gray-500')}>{profile.email}</p>
          </div>
        </div>

        {/* Name Edit */}
        <div className={cn('rounded-xl border shadow-sm p-4', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
          <h3 className={cn('font-semibold text-sm mb-3 flex items-center gap-2', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>
            <Icon name={BI.pencil} className="text-emerald-600" /> {t('nameChange')}
          </h3>
          <div className="flex gap-2">
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={cn('flex-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder={t('yourName')} />
            <button onClick={handleSaveName} disabled={savingName || !displayName.trim() || displayName.trim() === profile.displayName} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98] text-sm shrink-0">
              {savingName ? <LoadingSpinner size="sm" /> : t('save2')}
            </button>
          </div>
        </div>

        {/* Password Section */}
        <div className={cn('rounded-xl border shadow-sm p-4 space-y-3', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
          <h3 className={cn('font-semibold text-sm flex items-center gap-2', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>
            <Icon name={BI.key} className="text-emerald-600" /> {t('passwordSection')}
          </h3>
          <button onClick={() => setShowPasswordModal(true)} className={cn('w-full py-2.5 px-4 rounded-xl font-medium transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2', dark ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}>
            <Icon name={BI.lock} /> {t('changePasswordBtn')}
          </button>
          <div className={cn('border-t pt-3', dark ? 'border-gray-700' : 'border-gray-100')}>
            <p className={cn('text-xs mb-2', dark ? 'text-gray-400' : 'text-gray-500')}>{t('resetEmailDesc')}</p>
            <button onClick={handleSendResetEmail} disabled={resetLoading || resetEmailSent} className={cn('w-full py-2.5 px-4 rounded-xl font-medium transition-all disabled:opacity-50 active:scale-[0.98] text-sm flex items-center justify-center gap-2', dark ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100')}>
              <Icon name={BI.envelope} />
              {resetEmailSent ? t('resetSentBtn') : t('resetSendBtn')}
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className={cn('rounded-xl border shadow-sm p-4', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
          <h3 className={cn('font-semibold text-sm mb-3 flex items-center gap-2', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>
            <Icon name={BI.personCircle} className="text-emerald-600" /> {t('accountInfo')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className={cn('flex justify-between py-1.5 border-b', dark ? 'border-gray-700' : 'border-gray-50')}>
              <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t('email')}</span>
              <span className={cn('font-medium', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{profile.email}</span>
            </div>
            <div className={cn('flex justify-between py-1.5 border-b', dark ? 'border-gray-700' : 'border-gray-50')}>
              <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t('role')}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', profile.role === 'admin' ? (dark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700') : (dark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'))}>{profile.role === 'admin' ? 'Admin' : 'User'}</span>
            </div>
            <div className={cn('flex justify-between py-1.5 border-b', dark ? 'border-gray-700' : 'border-gray-50')}>
              <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t('accountCreated')}</span>
              <span className={cn('text-xs', dark ? 'text-gray-300' : 'text-gray-700')}>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('bn-BD') : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t('status')}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', profile.isActive ? (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (dark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'))}>{profile.isActive ? t('active') : t('inactive')}</span>
            </div>
          </div>
        </div>

        {/* User Guide Button */}
        <button
          onClick={onShowGuide}
          className={cn('w-full rounded-xl border shadow-sm p-4 flex items-center gap-3 transition-all active:scale-[0.98] hover:shadow-md', dark ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border-emerald-800/50 hover:border-emerald-700/70' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-300')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow">
            <Icon name={BI.book} className="text-white" />
          </div>
          <div className="text-left">
            <div className={cn('font-semibold text-sm', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{t('userGuide')}</div>
            <div className={cn('text-xs', dark ? 'text-gray-400' : 'text-gray-500')}>{t('userGuideDesc')}</div>
          </div>
          <Icon name={BI.arrowRight} className={cn('ml-auto shrink-0', dark ? 'text-gray-500' : 'text-gray-400')} />
        </button>
      </div>

      {showPasswordModal && <PasswordChangeModal onClose={() => setShowPasswordModal(false)} onToast={(msg, type) => setToast({ message: msg, type })} dark={dark} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ==================== SETTINGS PAGE ====================

function SettingsPage({ user, profile, dark, setDark, siteConfig }: { user: { uid: string; email?: string | null }; profile: UserProfile; dark: boolean; setDark: (v: boolean) => void; siteConfig: SiteConfig }) {
  const t = useT();
  const { lang, setLang } = useI18n();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [mealBreakHours, setMealBreakHours] = useState(1);
  const [emailNotif, setEmailNotif] = useState(profile.emailNotif || false);

  const hourlyRate = profile.hourlyRate || 0;
  const otRate = profile.otRate || 0;
  const weeklyHolidayDays = (profile.weeklyHolidayDays && profile.weeklyHolidayDays.length > 0) ? profile.weeklyHolidayDays : [0];
  const weeklyHolName = weeklyHolidayLabel(weeklyHolidayDays);

  const debouncedUpdateRef = useRef<Record<string, ReturnType<typeof debounce>>>({});

  const getDebouncedUpdater = useCallback((field: string, value: unknown) => {
    const key = field;
    if (!debouncedUpdateRef.current[key]) {
      debouncedUpdateRef.current[key] = debounce(async (val: unknown) => {
        try {
          await updateUserProfile(user.uid, { [field]: val } as Partial<UserProfile>);
          setToast({ message: t('updated'), type: 'success' });
        } catch {
          setToast({ message: t('updateFailed'), type: 'error' });
        }
      }, 800);
    }
    debouncedUpdateRef.current[key](value);
  }, [user.uid]);

  const handleEmailNotifToggle = async () => {
    const newVal = !emailNotif;
    setEmailNotif(newVal);
    try {
      await updateUserProfile(user.uid, { emailNotif: newVal });
      setToast({ message: newVal ? t('notifOn') : t('notifOff'), type: 'success' });
    } catch {
      setEmailNotif(!newVal);
      setToast({ message: t('updateFailed'), type: 'error' });
    }
  };

  const sectionClass = cn('rounded-xl border shadow-sm p-4 space-y-3', !dark ? 'bg-white border-gray-100' : 'bg-[#1E1E1E] border-gray-700');
  const labelClass = cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-500');
  const inputClass = cn('w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200 text-[#212529] bg-white');
  const headingClass = cn('font-semibold text-sm flex items-center gap-2', dark ? 'text-[#E0E0E0]' : 'text-[#212529]');
  const descClass = cn('text-xs', dark ? 'text-gray-400' : 'text-gray-500');

  return (
    <div className={cn('min-h-screen pb-24', dark ? 'bg-[#121212]' : 'bg-[#F8F9FA]')}>
      <header className={cn('border-b sticky top-0 z-30 safe-area-top', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-200')}>
        <div className='max-w-7xl mx-auto px-4 py-3 flex items-center gap-3'>
          <div className={cn('w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden', siteConfig.siteLogo && 'p-0')}><div style={{display:'contents'}}>{siteConfig.siteLogo ? <img src={siteConfig.siteLogo} alt="" className="w-full h-full object-cover" /> : 'OT'}</div></div>
          <h1 className={cn('font-semibold text-sm', dark ? 'text-[#E0E0E0]' : 'text-[#212529]')}>{t('settings')}</h1>
        </div>
      </header>

      <div className='max-w-7xl mx-auto px-4 py-4 space-y-4'>
        {/* ====== 1. ডিউটি সেটিংস ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.clock} className='text-emerald-500' /> {t('dutySettings')}
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className={labelClass}>{t('dutyStartTime')}</label>
              <input
                type='time'
                defaultValue={profile.dutyStartTime || '09:00'}
                onChange={(e) => getDebouncedUpdater('dutyStartTime', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('dutyHoursSetting')}</label>
              <input
                type='number'
                min='1'
                max='24'
                defaultValue={profile.dutyHours || 8}
                onChange={(e) => getDebouncedUpdater('dutyHours', parseInt(e.target.value) || 8)}
                className={cn(inputClass, 'text-center')}
              />
            </div>
          </div>
        </div>

        {/* ====== 2. সাপ্তাহিক ছুটি ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.calendarWeek} className='text-orange-500' /> {t('weeklyHoliday')}
          </h3>
          <div className='flex flex-wrap gap-1.5'>
            {dayNamesFull.map((name, idx) => (
              <button
                key={idx}
                type='button'
                onClick={() => {
                  const current = weeklyHolidayDays.includes(idx);
                  let newDays: number[];
                  if (current) {
                    if (weeklyHolidayDays.length <= 1) return;
                    newDays = weeklyHolidayDays.filter(d => d !== idx);
                  } else {
                    newDays = [...weeklyHolidayDays, idx].sort();
                  }
                  updateUserProfile(user.uid, { weeklyHolidayDays: newDays }).catch(() => {});
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95',
                  weeklyHolidayDays.includes(idx)
                    ? (dark ? 'bg-orange-900/40 border-orange-600 text-orange-300' : 'bg-orange-100 border-orange-300 text-orange-700')
                    : (dark ? 'bg-[#2A2A2A] border-gray-600 text-gray-400 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100')
                )}
              >
                {name}
              </button>
            ))}
          </div>
          <p className={cn('text-[10px] mt-1', dark ? 'text-gray-500' : 'text-gray-400')}>{t('doubleRateOnSelected')}</p>
        </div>

        {/* ====== 3. খাবার বিরতি ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.alarm} className='text-blue-500' /> {t('mealBreak')}
          </h3>
          <div className='flex items-center gap-3'>
            <input
              type='number'
              min='0'
              max='4'
              step='0.5'
              value={mealBreakHours}
              onChange={(e) => setMealBreakHours(parseFloat(e.target.value) || 0)}
              className={cn(inputClass, 'w-20 text-center')}
            />
            <div className={descClass}>{t('mealBreakDesc')}</div>
          </div>
          <p className={cn('text-[10px] mt-1', dark ? 'text-gray-500' : 'text-gray-400')}>{t('mealBreakExample')}</p>
        </div>

        {/* ====== 4. রেট সেটিংস ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.currencyExchange} className='text-teal-500' /> {t('rateSettings')}
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className={labelClass}>{t('basicRateHour')}</label>
              <input
                type='number'
                min='0'
                step='0.01'
                defaultValue={hourlyRate}
                onChange={(e) => getDebouncedUpdater('hourlyRate', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, 'text-center')}
                placeholder='৳'
              />
            </div>
            <div>
              <label className={labelClass}>{t('otRateHour')}</label>
              <input
                type='number'
                min='0'
                step='0.01'
                defaultValue={otRate}
                onChange={(e) => getDebouncedUpdater('otRate', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, 'text-center')}
                placeholder='৳'
              />
            </div>
          </div>
          <div className={cn('mt-2 rounded-lg px-3 py-2 flex items-center gap-2', dark ? 'bg-orange-900/30 border border-orange-800' : 'bg-orange-50 border border-orange-200')}>
            <Icon name={BI.calendarWeek} className='text-orange-500 shrink-0' />
            <div className={cn('text-xs', dark ? 'text-orange-300' : 'text-orange-700')}>
              <span className='font-semibold'>{weeklyHolName}:</span> {t('rateInfo')}
            </div>
          </div>
        </div>

        {/* ====== 5. মাসের সূচনা তারিখ ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.calendar3} className='text-cyan-500' /> {t('salaryCycleStart')}
          </h3>
          <p className={descClass}>{t('cycleDesc')}</p>
          <div className='flex items-center gap-3'>
            <select
              defaultValue={profile.salaryCycleDay || 1}
              onChange={(e) => getDebouncedUpdater('salaryCycleDay', parseInt(e.target.value))}
              className={cn(inputClass, 'flex-1')}
            >
              <option value={1}>{t('day1Normal')}</option>
              {Array.from({ length: 27 }, (_, i) => i + 2).map(d => (
                <option key={d} value={d}>{t('dayFrom', { d, next: d === 2 ? '1' : String(d - 1) })}</option>
              ))}
            </select>
          </div>
          {(profile.salaryCycleDay && profile.salaryCycleDay > 1) && (
            <div className={cn('mt-2 rounded-lg px-3 py-2 flex items-center gap-2', dark ? 'bg-cyan-900/30 border border-cyan-800' : 'bg-cyan-50 border border-cyan-200')}>
              <Icon name={BI.exclamationTriangle} className='text-cyan-500 shrink-0' />
              <div className={cn('text-xs', dark ? 'text-cyan-300' : 'text-cyan-700')}>
                {t('cycleInfo', { d: profile.salaryCycleDay, next: profile.salaryCycleDay === 2 ? 1 : profile.salaryCycleDay - 1 })}
              </div>
            </div>
          )}
        </div>

        {/* ====== 6. কাস্টম হলিডে ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.umbrella} className='text-amber-500' /> {t('customHolidaySetting')}
          </h3>
          <p className={descClass}>{t('holidayDesc')}</p>
          <button
            onClick={() => setShowHolidayModal(true)}
            className={cn('w-full py-2.5 px-4 rounded-xl font-medium transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2', dark ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 border border-amber-800/50' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}
          >
            <Icon name={BI.umbrella} /> {t('manageHoliday')}
          </button>
        </div>

        {/* ====== 6. অ্যাপিয়ারেন্স ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.palette} className='text-purple-500' /> {t('appearance')}
          </h3>
          {/* Dark Mode */}
          <div className={cn('flex items-center justify-between p-3 rounded-xl', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
            <div className='flex items-center gap-3'>
              <Icon name={dark ? BI.moonStars : BI.sun} className={cn('text-lg', dark ? 'text-yellow-400' : 'text-amber-500')} />
              <div>
                <div className={cn('text-sm font-medium', dark ? 'text-[#E0E0E0]' : 'text-[#212529]')}>{dark ? t('darkMode') : t('lightMode')}</div>
                <div className={cn('text-[10px]', dark ? 'text-gray-500' : 'text-gray-400')}>{t('themeDesc')}</div>
              </div>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className={cn('relative w-12 h-7 rounded-full transition-colors', dark ? 'bg-emerald-600' : 'bg-gray-300')}
            >
              <span className={cn('absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform', dark ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
          {/* Language */}
          <div className={cn('flex items-center justify-between p-3 rounded-xl', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
            <div className='flex items-center gap-3'>
              <Icon name={BI.bodyText} className='text-lg text-blue-400' />
              <div>
                <div className={cn('text-sm font-medium', dark ? 'text-[#E0E0E0]' : 'text-[#212529]')}>{t('language')}</div>
                <div className={cn('text-[10px]', dark ? 'text-gray-500' : 'text-gray-400')}>{t('langDesc')}</div>
              </div>
            </div>
            <div className='flex gap-1'>
              <button
                onClick={() => setLang('bn')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', lang === 'bn' ? 'bg-emerald-600 text-white' : (dark ? 'bg-[#2A2A2A] text-gray-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'))}
              >
                {t('bengali')}
              </button>
              <button
                onClick={() => setLang('en')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', lang === 'en' ? 'bg-emerald-600 text-white' : (dark ? 'bg-[#2A2A2A] text-gray-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'))}
              >
                {t('english')}
              </button>
            </div>
          </div>
        </div>

        {/* ====== 7. পাসওয়ার্ড ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.key} className='text-emerald-500' /> {t('password')}
          </h3>
          <button
            onClick={() => setShowPasswordModal(true)}
            className={cn('w-full py-2.5 px-4 rounded-xl font-medium transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2', dark ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}
          >
            <Icon name={BI.lock} /> {t('changePasswordBtn')}
          </button>
        </div>

        {/* ====== 8. ইমেইল নোটিফিকেশন ====== */}
        <div className={sectionClass}>
          <h3 className={headingClass}>
            <Icon name={BI.bell} className='text-blue-500' /> {t('emailNotification')}
          </h3>
          <div className={cn('flex items-center justify-between p-3 rounded-xl', dark ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>
            <div>
              <div className={cn('text-sm font-medium', dark ? 'text-[#E0E0E0]' : 'text-[#212529]')}>{t('monthlySalaryReport')}</div>
              <div className={cn('text-[10px]', dark ? 'text-gray-500' : 'text-gray-400')}>{t('emailReportDesc')}</div>
            </div>
            <button
              onClick={handleEmailNotifToggle}
              className={cn('relative w-12 h-7 rounded-full transition-colors', emailNotif ? 'bg-emerald-600' : (dark ? 'bg-gray-600' : 'bg-gray-300'))}
            >
              <span className={cn('absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform', emailNotif ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPasswordModal && <PasswordChangeModal onClose={() => setShowPasswordModal(false)} onToast={(msg, type) => setToast({ message: msg, type: type === 'success' ? 'success' : 'error' })} dark={dark} />}
      {showHolidayModal && <HolidayModal onClose={() => setShowHolidayModal(false)} onToast={(msg, type) => setToast({ message: msg, type: type === 'success' ? 'success' : 'error' })} isAdmin={profile.role === 'admin'} weeklyHolidayDays={weeklyHolidayDays} weeklyHolName={weeklyHolName} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ==================== ADMIN PANEL ====================

function AdminPanel({ user, profile, dark, siteConfig }: { user: { uid: string }; profile: UserProfile; dark: boolean; siteConfig: SiteConfig }) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'overtime' | 'consolidated' | 'activity' | 'bulk-salary' | 'settings'>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userOvertime, setUserOvertime] = useState<Record<string, OvertimeEntry[]>>({});
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, Record<string, PaymentStatus>>>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // #28: Admin entry edit state
  const [adminEditEntry, setAdminEditEntry] = useState<OvertimeEntry | null>(null);
  const [adminEditOt, setAdminEditOt] = useState(0);
  const [adminEditShift, setAdminEditShift] = useState(8);
  const [adminEditNote, setAdminEditNote] = useState('');
  const [adminEditMonth, setAdminEditMonth] = useState('');

  // #28: Admin add entry state
  const [showAdminAdd, setShowAdminAdd] = useState(false);
  const [adminAddDate, setAdminAddDate] = useState('');
  const [adminAddOt, setAdminAddOt] = useState(0);
  const [adminAddShift, setAdminAddShift] = useState(8);
  const [adminAddNote, setAdminAddNote] = useState('');

  // #29: Admin rate set state
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateTargetUser, setRateTargetUser] = useState<UserProfile | null>(null);
  const [rateHourly, setRateHourly] = useState(0);
  const [rateOt, setRateOt] = useState(0);

  // #25: Consolidated report month filter
  const [consolidatedMonth, setConsolidatedMonth] = useState(getMonthKey(new Date()));
  const [consolidatedData, setConsolidatedData] = useState<Array<{ user: UserProfile; summary: ReturnType<typeof calcMonthSummary>; entries: OvertimeEntry[] }>>([]);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);

  // ImgBB API Key (admin config)
  const [imgbbKey, setImgbbKey] = useState('');
  const [savingImgbbKey, setSavingImgbbKey] = useState(false);

  // Site settings
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteFooter, setSiteFooter] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSite, setSavingSite] = useState(false);

  useEffect(() => {
    const unsub = subscribeAppConfig((config) => {
      setImgbbKey(config?.imgbbApiKey || '');
      setSiteTitle(config?.siteTitle || '');
      setSiteDescription(config?.siteDescription || '');
      setSiteFooter(config?.siteFooter || '');
      setSiteLogo(config?.siteLogo || '');
    });
    return unsub;
  }, []);

  const handleSaveImgbbKey = async () => {
    setSavingImgbbKey(true);
    try {
      await setAppConfig({ imgbbApiKey: imgbbKey.trim() });
      setToast({ message: t('imgbbKeySaved'), type: 'success' });
    } catch {
      setToast({ message: t('apiKeySaveFailed'), type: 'error' });
    }
    setSavingImgbbKey(false);
  };

  const handleSaveSiteSettings = async () => {
    setSavingSite(true);
    try {
      await setAppConfig({ siteTitle: siteTitle.trim(), siteDescription: siteDescription.trim(), siteFooter: siteFooter.trim(), siteLogo });
      setToast({ message: t('siteSettingsSaved'), type: 'success' });
    } catch {
      setToast({ message: t('settingsSaveFailed'), type: 'error' });
    }
    setSavingSite(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setToast({ message: t('logoSizeError'), type: 'error' }); return; }
    setUploadingLogo(true);
    try {
      const key = imgbbKey.trim();
      if (key) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const url = await uploadToImgBB(base64, key);
        setSiteLogo(url);
        await setAppConfig({ siteLogo: url });
        setToast({ message: t('logoUploaded'), type: 'success' });
      } else {
        setToast({ message: t('setImgbbKeyFirst'), type: 'error' });
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      setToast({ message: t('logoUploadError'), type: 'error' });
    }
    setUploadingLogo(false);
  };

  const [logoUrl, setLogoUrl] = useState('');
  const [savingLogoUrl, setSavingLogoUrl] = useState(false);

  const handleLogoUrlSave = async () => {
    const url = logoUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) { setToast({ message: t('validUrl'), type: 'error' }); return; }
    setSavingLogoUrl(true);
    try {
      setSiteLogo(url);
      await setAppConfig({ siteLogo: url });
      setToast({ message: t('logoSaved'), type: 'success' });
      setLogoUrl('');
    } catch {
      setToast({ message: t('logoSaveFailed'), type: 'error' });
    }
    setSavingLogoUrl(false);
  };

  const loadData = useCallback(async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch {
      setToast({ message: t('dataLoadFailed2'), type: 'error' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Load payment statuses
  const loadPaymentStatuses = useCallback(async () => {
    try {
      const ps = await getPaymentStatuses();
      setPaymentStatuses(ps);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadPaymentStatuses(); }, [loadPaymentStatuses]);

  // #25: Load consolidated data
  const loadConsolidated = useCallback(async () => {
    if (!consolidatedMonth) return;
    setLoadingConsolidated(true);
    try {
      const results: Array<{ user: UserProfile; summary: ReturnType<typeof calcMonthSummary>; entries: OvertimeEntry[] }> = [];
      const activeUsers = users.filter(u => u.isActive);
      for (const u of activeUsers) {
        const data = await getAdminOvertimeData(u.uid);
        const monthEntries = data[consolidatedMonth] || [];
        const sum = calcMonthSummary(monthEntries, u.hourlyRate || 0, u.otRate || 0, u.weeklyHolidayDays || [0]);
        if (monthEntries.length > 0) results.push({ user: u, summary: sum, entries: monthEntries });
      }
      results.sort((a, b) => b.summary.totalSalary - a.summary.totalSalary);
      setConsolidatedData(results);
    } catch { setToast({ message: t('consolidatedLoadFailed'), type: 'error' }); }
    setLoadingConsolidated(false);
  }, [consolidatedMonth, users]);

  // #27: Load activity logs
  const loadActivityLogs = useCallback(async () => {
    try {
      const logs = await getActivityLogs(100);
      setActivityLogs(logs);
    } catch { setToast({ message: t('activityLoadFailed'), type: 'error' }); }
  }, []);

  const handleViewUser = async (u: UserProfile) => {
    setSelectedUser(u);
    setActiveTab('overtime');
    try {
      const data = await getAdminOvertimeData(u.uid);
      setUserOvertime(data);
    } catch {
      setToast({ message: t('otDataLoadFailed'), type: 'error' });
    }
  };

  const handleToggleActive = async (u: UserProfile) => {
    try {
      await updateUserProfile(u.uid, { isActive: !u.isActive });
      await loadData();
      setToast({ message: t(!u.isActive ? 'userActivated' : 'userDeactivated', { name: u.displayName }), type: 'success' });
    } catch {
      setToast({ message: t('updateFailed'), type: 'error' });
    }
  };

  const handleDeleteUser = (u: UserProfile) => {
    if (u.uid === user.uid) {
      setToast({ message: t('cannotDeleteSelf'), type: 'error' });
      return;
    }
    setConfirmAction({
      message: t('confirmDeleteUser', { name: u.displayName }),
      onConfirm: async () => {
        try {
          await deleteUserProfile(u.uid);
          await loadData();
          setToast({ message: t('userDeleted'), type: 'success' });
        } catch {
          setToast({ message: t('deleteFailed2'), type: 'error' });
        }
        setConfirmAction(null);
      },
    });
  };

  const handleMakeAdmin = async (u: UserProfile) => {
    try {
      await updateUserProfile(u.uid, { role: u.role === 'admin' ? 'user' : 'admin' });
      await loadData();
      setToast({ message: t('roleChanged', { name: u.displayName }), type: 'success' });
    } catch {
      setToast({ message: t('roleChangeFailed'), type: 'error' });
    }
  };

  // #29: Admin rate set
  const openRateModal = (u: UserProfile) => {
    setRateTargetUser(u);
    setRateHourly(u.hourlyRate || 0);
    setRateOt(u.otRate || 0);
    setShowRateModal(true);
  };

  const handleAdminRateSet = async () => {
    if (!rateTargetUser) return;
    try {
      const oldH = rateTargetUser.hourlyRate || 0;
      const oldO = rateTargetUser.otRate || 0;
      await updateUserProfile(rateTargetUser.uid, { hourlyRate: rateHourly, otRate: rateOt });
      logActivity({ uid: user.uid, userName: profile.displayName, action: 'admin_rate_set', details: t('logRateChange', { name: rateTargetUser.displayName, oldBasic: formatTaka(oldH), newBasic: formatTaka(rateHourly), oldOt: formatTaka(oldO), newOt: formatTaka(rateOt) }), timestamp: new Date().toISOString() }).catch(() => {});
      setToast({ message: t('rateUpdated', { name: rateTargetUser.displayName }), type: 'success' });
      setShowRateModal(false);
      await loadData();
    } catch {
      setToast({ message: t('rateUpdateFailed'), type: 'error' });
    }
  };

  // #28: Admin entry edit save
  const handleAdminEditSave = async () => {
    if (!selectedUser || !adminEditEntry) return;
    try {
      await updateOvertimeEntry(selectedUser.uid, adminEditMonth, adminEditEntry.id, {
        overtimeHours: adminEditOt,
        shiftHours: adminEditShift,
        note: adminEditNote,
      });
      logActivity({ uid: user.uid, userName: profile.displayName, action: 'admin_edit_entry', details: t('logEntryEdit', { name: selectedUser.displayName, date: adminEditEntry.date, ot: adminEditOt, shift: adminEditShift }), timestamp: new Date().toISOString(), monthKey: adminEditMonth }).catch(() => {});
      setToast({ message: t('adminEntryUpdated'), type: 'success' });
      setAdminEditEntry(null);
      // Reload
      const data = await getAdminOvertimeData(selectedUser.uid);
      setUserOvertime(data);
    } catch {
      setToast({ message: t('adminEntryUpdateFailed'), type: 'error' });
    }
  };

  // #28: Admin add entry
  const handleAdminAddEntry = async () => {
    if (!selectedUser || !adminAddDate) return;
    try {
      await adminAddOvertimeEntry(selectedUser.uid, { date: adminAddDate, overtimeHours: adminAddOt, shiftHours: adminAddShift, note: adminAddNote });
      logActivity({ uid: user.uid, userName: profile.displayName, action: 'admin_add_entry', details: t('logEntryAdd', { name: selectedUser.displayName, date: adminAddDate, ot: adminAddOt, shift: adminAddShift }), timestamp: new Date().toISOString(), monthKey: adminAddDate.substring(0, 7) }).catch(() => {});
      setToast({ message: t('adminEntryAdded'), type: 'success' });
      setShowAdminAdd(false); setAdminAddDate(''); setAdminAddOt(0); setAdminAddShift(selectedUser.dutyHours || 8); setAdminAddNote('');
      const data = await getAdminOvertimeData(selectedUser.uid);
      setUserOvertime(data);
    } catch {
      setToast({ message: t('adminEntryAddFailed'), type: 'error' });
    }
  };

  // #28: Admin delete entry
  const handleAdminDeleteEntry = (entry: OvertimeEntry, monthKey: string) => {
    if (!selectedUser) return;
    setConfirmAction({
      message: t('confirmDelete', { date: formatDate(entry.date) }),
      onConfirm: async () => {
        try {
          await adminDeleteOvertimeEntry(selectedUser.uid, monthKey, entry.id);
          logActivity({ uid: user.uid, userName: profile.displayName, action: 'delete_entry', details: t('logEntryDelete', { name: selectedUser.displayName, date: formatDate(entry.date) }), timestamp: new Date().toISOString(), monthKey }).catch(() => {});
          setToast({ message: t('entryDeleted'), type: 'success' });
          const data = await getAdminOvertimeData(selectedUser.uid);
          setUserOvertime(data);
        } catch {
          setToast({ message: t('adminDeleteFailed'), type: 'error' });
        }
        setConfirmAction(null);
      },
    });
  };

  // #30: Toggle payment status
  const handlePaymentToggle = async (u: UserProfile, monthKey: string) => {
    const current = paymentStatuses[u.uid]?.[monthKey]?.status || 'unpaid';
    const newStatus: 'paid' | 'unpaid' = current === 'paid' ? 'unpaid' : 'paid';
    try {
      await setPaymentStatus(u.uid, monthKey, { monthKey, status: newStatus, paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined });
      logActivity({ uid: user.uid, userName: profile.displayName, action: 'payment_status', details: t('logPaymentStatus', { name: u.displayName, month: getMonthName(monthKey), status: newStatus === 'paid' ? 'Paid' : 'Unpaid' }), timestamp: new Date().toISOString() }).catch(() => {});
      setToast({ message: `${u.displayName} - ${getMonthName(monthKey)} ${newStatus === 'paid' ? 'Paid' : 'Unpaid'}`, type: 'success' });
      await loadPaymentStatuses();
    } catch {
      setToast({ message: t('paymentUpdateFailed'), type: 'error' });
    }
  };

  // #26: Bulk salary slip generation
  const handleBulkSalarySlip = async () => {
    try {
      const activeUsersList = users.filter(u => u.isActive);
      for (const u of activeUsersList) {
        const data = await getAdminOvertimeData(u.uid);
        if (Object.keys(data).length > 0) {
          // Get the latest month with data
          const latestMonth = Object.keys(data).sort().reverse()[0];
          const entries = data[latestMonth] || [];
          if (entries.length > 0) {
            openPrintWindow(generateSalarySlipHTML({ entries, displayName: u.displayName, email: u.email, hourlyRate: u.hourlyRate || 0, otRate: u.otRate || 0, monthKey: latestMonth }));
          }
        }
      }
      setToast({ message: t('bulkSlipGenerating'), type: 'success' });
    } catch {
      setToast({ message: t('bulkSlipFailed'), type: 'error' });
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      add_entry: t('action_add_entry'), edit_entry: t('action_edit_entry'), delete_entry: t('action_delete_entry'),
      admin_edit_entry: t('action_admin_edit_entry'), admin_add_entry: t('action_admin_add_entry'), admin_rate_set: t('admin_rate_set'),
      payment_status: t('action_payment_status'), login: t('action_login'), profile_update: t('action_profile_update'), rate_change: t('action_rate_change_log'),
    };
    return map[action] || action;
  };

  const adminInputCls = cn('w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200');

  const card = cn('rounded-xl border shadow-sm', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100');
  const txt = cn(dark ? 'text-[#E0E0E0]' : 'text-gray-900');
  const txt2 = cn(dark ? 'text-gray-400' : 'text-gray-500');
  const bdr = dark ? 'border-gray-700' : 'border-gray-100';
  const hov = dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const divd = dark ? 'divide-gray-700' : 'divide-gray-50';

  const actionColor = (action: string) => {
    if (action.includes('add')) return dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
    if (action.includes('edit')) return dark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700';
    if (action.includes('delete')) return dark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700';
    if (action.includes('rate')) return dark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700';
    if (action.includes('payment')) return dark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700';
    if (action.includes('login')) return dark ? 'bg-teal-900/30 text-teal-300' : 'bg-teal-100 text-teal-700';
    return dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
  };

  return (
    <div className={cn('min-h-screen pb-24', dark ? 'bg-[#121212]' : 'bg-[#F8F9FA]')}>
      <header className={cn('border-b sticky top-0 z-30 safe-area-top', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-200')}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden', siteConfig.siteLogo && 'p-0')}><div style={{display:'contents'}}>{siteConfig.siteLogo ? <img src={siteConfig.siteLogo} alt="" className="w-full h-full object-cover" /> : 'OT'}</div></div>
            <div>
              <h1 className={cn('font-semibold text-sm', txt)}>{siteConfig.siteTitle || 'Admin Panel'}</h1>
              <p className={cn('text-xs', txt2)}>{profile.displayName}</p>
            </div>
          </div>
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1', dark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')}>
            <Icon name={BI.shieldCheck} /> Admin
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Tabs - scrollable on mobile */}
        <div className={cn('flex rounded-xl border p-1 mb-4 shadow-sm overflow-x-auto gap-1', card)}>
          <button onClick={() => setActiveTab('dashboard')} className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap', activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow' : cn(txt2, hov))}>
            <Icon name={BI.speedometer} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('users')} className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap', activeTab === 'users' ? 'bg-emerald-600 text-white shadow' : cn(txt2, hov))}>
            <Icon name={BI.people} /> {t('users')}
          </button>
          <button onClick={() => setActiveTab('overtime')} className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap', activeTab === 'overtime' ? 'bg-emerald-600 text-white shadow' : cn(txt2, hov))}>
            <Icon name={BI.clockHistory} /> {t('otData')}
          </button>
          <button onClick={() => { setActiveTab('consolidated'); loadConsolidated(); }} className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap', activeTab === 'consolidated' ? 'bg-emerald-600 text-white shadow' : cn(txt2, hov))}>
            <Icon name={BI.table} /> {t('report')}
          </button>
          <button onClick={() => { setActiveTab('activity'); loadActivityLogs(); }} className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap', activeTab === 'activity' ? 'bg-emerald-600 text-white shadow' : cn(txt2, hov))}>
            <Icon name={BI.listTask} /> {t('log')}
          </button>
          <button onClick={() => setActiveTab('bulk-salary')} className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap', activeTab === 'bulk-salary' ? 'bg-emerald-600 text-white shadow' : cn(txt2, hov))}>
            <Icon name={BI.journalCheck} /> {t('slip')}
          </button>
          <button onClick={() => setActiveTab('settings')} className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap', activeTab === 'settings' ? 'bg-emerald-600 text-white shadow' : cn(txt2, hov))}>
            <Icon name={BI.gear} /> {t('settings')}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* ====== DASHBOARD TAB ====== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className={cn(card, 'p-4 text-center')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 mx-auto mb-2', dark ? 'bg-emerald-900/30' : 'bg-emerald-100')}><Icon name={BI.people} className="text-xl" /></div>
                    <div className={cn('text-2xl font-bold', txt)}>{totalUsers}</div>
                    <div className={cn('text-[10px]', txt2)}>{t('totalUsers')}</div>
                  </div>
                  <div className={cn(card, 'p-4 text-center')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-teal-600 mx-auto mb-2', dark ? 'bg-teal-900/30' : 'bg-teal-100')}><Icon name={BI.checkCircle} className="text-xl" /></div>
                    <div className={cn('text-2xl font-bold', txt)}>{activeUsers}</div>
                    <div className={cn('text-[10px]', txt2)}>{t('totalActive')}</div>
                  </div>
                  <div className={cn(card, 'p-4 text-center')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 mx-auto mb-2', dark ? 'bg-amber-900/30' : 'bg-amber-100')}><Icon name={BI.shieldCheck} className="text-xl" /></div>
                    <div className={cn('text-2xl font-bold', txt)}>{adminUsers}</div>
                    <div className={cn('text-[10px]', txt2)}>Admin</div>
                  </div>
                </div>
                {/* Quick action cards */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setActiveTab('consolidated'); loadConsolidated(); }} className={cn(card, 'p-4 text-left hover:shadow-md transition-all active:scale-[0.98]')}>
                    <div className="flex items-center gap-2 mb-1"><Icon name={BI.table} className="text-emerald-600" /><span className={cn('text-xs font-semibold', txt)}>{t('consolidatedReport')}</span></div>
                    <p className="text-[10px] text-gray-400">{t('allUserSalary')}</p>
                  </button>
                  <button onClick={() => { setActiveTab('activity'); loadActivityLogs(); }} className={cn(card, 'p-4 text-left hover:shadow-md transition-all active:scale-[0.98]')}>
                    <div className="flex items-center gap-2 mb-1"><Icon name={BI.listTask} className="text-blue-600" /><span className={cn('text-xs font-semibold', txt)}>{t('activityLog')}</span></div>
                    <p className="text-[10px] text-gray-400">{t('trackUserActivity')}</p>
                  </button>
                </div>
                <div className={card}>
                  <div className={cn('p-3 border-b', bdr)}><h3 className={cn('font-semibold text-sm', txt)}>{t('recentUsers')}</h3></div>
                  <div className={cn('divide-y', divd)}>
                    {users.slice(0, 5).map(u => (
                      <div key={u.uid} className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full object-cover shrink-0" /> : <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0', dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>{u.displayName?.charAt(0)?.toUpperCase() || '?'}</div>}
                          <div className="min-w-0">
                            <div className={cn('text-sm font-medium truncate', txt)}>{u.displayName}</div>
                            <div className="text-xs text-gray-400 truncate">{u.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full', u.isActive ? (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'))}>{u.isActive ? 'Active' : 'Inactive'}</span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full', u.role === 'admin' ? (dark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700') : (dark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'))}>{u.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ====== USERS TAB (#28, #29, #30 integrated) ====== */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                <div className="relative">
                  <Icon name={BI.search} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('searchUser')} className={cn('w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'bg-white border-gray-200')} />
                </div>
                <div className={card}>
                  <div className={cn('p-3 border-b', bdr)}><h3 className={cn('font-semibold text-sm', txt)}>{t('allUsers', { n: filteredUsers.length })}</h3></div>
                  <div className={cn('divide-y', divd)}>
                    {filteredUsers.map(u => (
                      <div key={u.uid} className="px-3 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-full object-cover shrink-0" /> : <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0', dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>{u.displayName?.charAt(0)?.toUpperCase() || '?'}</div>}
                            <div className="min-w-0">
                              <div className={cn('text-sm font-medium truncate', txt)}>{u.displayName}</div>
                              <div className="text-xs text-gray-400 truncate">{u.email}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', u.role === 'admin' ? (dark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700') : (dark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'))}>{u.role}</span>
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', u.isActive ? (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (dark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'))}>{u.isActive ? 'Active' : 'Inactive'}</span>
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}>{formatTaka(u.hourlyRate || 0)}/h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleViewUser(u)} className={cn('p-2 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors active:scale-95', hov)} title={t('viewOtData')}><Icon name={BI.eye} className="text-sm" /></button>
                            <button onClick={() => openRateModal(u)} className={cn('p-2 rounded-lg text-gray-400 hover:text-purple-600 transition-colors active:scale-95', hov)} title={t('setRate')}><Icon name={BI.coin} className="text-sm" /></button>
                            <button onClick={() => handleMakeAdmin(u)} className={cn('p-2 rounded-lg text-gray-400 hover:text-amber-600 transition-colors active:scale-95', hov)} title={u.role === 'admin' ? t('makeUser') : t('makeAdmin')}><Icon name={BI.shieldCheck} className="text-sm" /></button>
                            <button onClick={() => handleToggleActive(u)} className={cn('p-2 rounded-lg transition-colors active:scale-95', hov, u.isActive ? 'text-gray-400 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600')} title={u.isActive ? 'Deactivate' : 'Activate'}><Icon name={u.isActive ? BI.xCircle : BI.checkCircle} className="text-sm" /></button>
                            <button onClick={() => handleDeleteUser(u)} className={cn('p-2 rounded-lg text-gray-400 hover:text-red-600 transition-colors active:scale-95', hov)} title={t('delete')}><Icon name={BI.trash} className="text-sm" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">{t('noUserFound')}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ====== OVERTIME DATA TAB (#28, #30 integrated) ====== */}
            {activeTab === 'overtime' && (
              <div className="space-y-4">
                {!selectedUser ? (
                  <div className={cn(card, 'p-8 text-center')}>
                    <Icon name={BI.eye} className="text-4xl text-gray-200 mx-auto mb-2" />
                    <p className={cn('text-sm', txt2)}>{t('selectUserToView')}</p>
                  </div>
                ) : (
                  <>
                    <div className={cn(card, 'p-3')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => { setSelectedUser(null); setUserOvertime({}); }} className={cn('p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors', hov)}><Icon name={BI.arrowLeft} className="text-lg" /></button>
                          {selectedUser.photoURL ? <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="w-10 h-10 rounded-full object-cover shrink-0" /> : <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold shrink-0', dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>{selectedUser.displayName?.charAt(0)?.toUpperCase() || '?'}</div>}
                          <div className="min-w-0">
                            <div className={cn('font-semibold text-sm truncate', txt)}>{selectedUser.displayName}</div>
                            <div className={cn('text-xs truncate', txt2)}>{selectedUser.email} | {formatTaka(selectedUser.hourlyRate || 0)}/h</div>
                          </div>
                        </div>
                        <button onClick={() => { setShowAdminAdd(true); setAdminAddShift(selectedUser.dutyHours || 8); }} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-1.5">
                          <Icon name={BI.plus} /> {t('addEntry')}
                        </button>
                      </div>
                    </div>

                    {Object.keys(userOvertime).length === 0 ? (
                      <div className={cn(card, 'p-8 text-center')}>
                        <Icon name={BI.clockHistory} className="text-4xl text-gray-200 mx-auto mb-2" />
                        <p className={cn('text-sm', txt2)}>{t('noOtData')}</p>
                      </div>
                    ) : (
                      Object.entries(userOvertime).sort(([a], [b]) => b.localeCompare(a)).map(([monthKey, entries]) => {
                        const uHourlyRate = selectedUser.hourlyRate || 0;
                        const uOtRate = selectedUser.otRate || 0;
                        const uWeeklyDays = selectedUser.weeklyHolidayDays || [0];
                        const mSummary = calcMonthSummary(entries, uHourlyRate, uOtRate, uWeeklyDays);
                        const pStatus = paymentStatuses[selectedUser.uid]?.[monthKey]?.status || 'unpaid';
                        return (
                          <div key={monthKey} className={card}>
                            <div className={cn('p-3 border-b', bdr)}>
                              <div className="flex items-center justify-between">
                                <h3 className={cn('font-semibold text-sm', txt)}>{getMonthName(monthKey)}</h3>
                                <div className="flex items-center gap-1.5">
                                  {/* #30: Payment status toggle */}
                                  <button
                                    onClick={() => handlePaymentToggle(selectedUser, monthKey)}
                                    className={cn('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95',
                                      pStatus === 'paid' ? (dark ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200') : (dark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'))}
                                  >
                                    <Icon name={pStatus === 'paid' ? BI.check2Square : BI.skipForward} className="mr-1" />
                                    {pStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                  </button>
                                  <button onClick={async () => {
                                    openPrintWindow(generateSalarySlipHTML({ entries, displayName: selectedUser.displayName, email: selectedUser.email, hourlyRate: uHourlyRate, otRate: uOtRate, monthKey }));
                                  }} className={cn('p-1.5 rounded-lg text-gray-400 hover:text-blue-600 transition-colors active:scale-95', hov)} title={t('salarySlip')}>
                                    <Icon name={BI.fileText} className="text-sm" />
                                  </button>
                                  <button onClick={async () => {
                                    try {
                                      const locked = await toggleMonthLock(selectedUser.uid, monthKey);
                                      setToast({ message: t(locked ? 'monthLockedMsg' : 'monthUnlockedMsg', { month: getMonthName(monthKey) }), type: 'success' });
                                      await loadData();
                                      setSelectedUser({ ...selectedUser, lockedMonths: locked ? [...(selectedUser.lockedMonths || []), monthKey] : (selectedUser.lockedMonths || []).filter((m: string) => m !== monthKey) });
                                    } catch { setToast({ message: t('lockFailed'), type: 'error' }); }
                                  }} className={cn('p-1.5 rounded-lg transition-colors active:scale-95', (selectedUser.lockedMonths || []).includes(monthKey) ? (dark ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-100 text-amber-600 hover:bg-amber-200') : cn(hov, 'text-gray-400 hover:text-amber-600'))} title={(selectedUser.lockedMonths || []).includes(monthKey) ? t('unlock') : t('lock')}>
                                    <Icon name={(selectedUser.lockedMonths || []).includes(monthKey) ? BI.lock : BI.unlock} className="text-sm" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-emerald-600 font-medium">OT: {mSummary.totalOT}h</span>
                                <span className="text-xs text-teal-600 font-medium">Shift: {mSummary.totalShift}h</span>
                                <span className="text-xs text-gray-400">{t('xDays', { n: entries.length })}</span>
                                <span className="text-xs text-emerald-700 font-bold">{t('salary')} {formatTaka(mSummary.totalSalary)}</span>
                                {pStatus === 'paid' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Paid</span>}
                              </div>
                            </div>
                            <div className={cn('divide-y', divd)}>
                              {entries.sort((a, b) => a.date.localeCompare(b.date)).map(entry => {
                                const entryIsSunday = isSunday(entry.date);
                                const money = calcEntryMoney(entry, uHourlyRate, uOtRate, uWeeklyDays);
                                return (
                                  <div key={entry.id} className="flex items-center justify-between px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                      <div className="text-center min-w-[36px]">
                                        <div className="text-sm font-bold text-gray-800">{formatDate(entry.date)}</div>
                                        {entryIsSunday && <div className="text-[9px] text-orange-500 font-bold">{t('sunday')}</div>}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', entryIsSunday ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700')}>{entry.overtimeHours}h</span>
                                          <span className="bg-teal-100 text-teal-700 text-xs font-medium px-2 py-0.5 rounded-full">{entry.shiftHours}h</span>
                                          {entryIsSunday && <span className="bg-orange-100 text-orange-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full">x2</span>}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                          {formatTaka(money.total)}
                                          {entryIsSunday && <span className="text-orange-500"> (x2)</span>}
                                        </div>
                                        {entry.note && <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">{entry.note}</p>}
                                      </div>
                                    </div>
                                    {/* #28: Admin entry action buttons */}
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button onClick={() => {
                                        setAdminEditEntry(entry); setAdminEditOt(entry.overtimeHours); setAdminEditShift(entry.shiftHours);
                                        setAdminEditNote(entry.note); setAdminEditMonth(monthKey);
                                      }} className={cn('p-1.5 rounded-lg text-gray-400 hover:text-blue-600 transition-colors', hov)} title={t('edit')}>
                                        <Icon name={BI.pencil} className="text-xs" />
                                      </button>
                                      <button onClick={() => handleAdminDeleteEntry(entry, monthKey)} className={cn('p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition-colors', hov)} title={t('deleteEntry')}>
                                        <Icon name={BI.trash} className="text-xs" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}

            {/* ====== #25: CONSOLIDATED REPORT TAB ====== */}
            {activeTab === 'consolidated' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="month" value={consolidatedMonth} onChange={(e) => { setConsolidatedMonth(e.target.value); }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                  <button onClick={loadConsolidated} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all active:scale-95">{t('view')}</button>
                </div>

                {loadingConsolidated ? (
                  <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
                ) : consolidatedData.length === 0 ? (
                  <div className={cn('rounded-xl border shadow-sm p-8 text-center', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
                    <Icon name={BI.table} className={cn('text-4xl mx-auto mb-2', dark ? 'text-gray-600' : 'text-gray-200')} />
                    <p className={cn('text-sm', dark ? 'text-gray-400' : 'text-gray-500')}>{t('noDataThisMonth')}</p>
                  </div>
                ) : (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl p-4 text-center text-white shadow-lg">
                        <div className="text-[10px] opacity-80">{t('totalUsers')}</div>
                        <div className="text-2xl font-bold mt-1">{consolidatedData.length}</div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-500 rounded-xl p-4 text-center text-white shadow-lg">
                        <div className="text-[10px] opacity-80">{t('totalSalary')}</div>
                        <div className="text-lg font-bold mt-1">{formatTaka(consolidatedData.reduce((s, d) => s + d.summary.totalSalary, 0))}</div>
                      </div>
                      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-center text-white shadow-lg">
                        <div className="text-[10px] opacity-80">{t('totalOtHours')}</div>
                        <div className="text-2xl font-bold mt-1">{consolidatedData.reduce((s, d) => s + d.summary.totalOT, 0)}h</div>
                      </div>
                    </div>

                    {/* Detailed table */}
                    <div className={cn('rounded-xl border shadow-sm overflow-hidden', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
                      <div className={cn('p-3 border-b flex items-center justify-between', dark ? 'border-gray-700' : 'border-gray-100')}>
                        <h3 className={cn('font-semibold text-sm', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{t('consolidatedTitle', { month: getMonthName(consolidatedMonth) })}</h3>
                        <button onClick={() => {
                          // CSV export
                          const rows = [t('users') + ',' + t('email') + ',' + t('csvShiftHours') + ',' + t('csvOtHours') + ',' + t('csvShiftMoney') + ',' + t('csvOtMoney') + ',' + t('totalSalary') + ',' + t('days') + ',' + t('payment')];
                          consolidatedData.forEach(d => {
                            const ps = paymentStatuses[d.user.uid]?.[consolidatedMonth]?.status || 'unpaid';
                            rows.push(`"${d.user.displayName}","${d.user.email}",${d.summary.totalShift},${d.summary.totalOT},${d.summary.shiftMoney},${d.summary.otMoney},${d.summary.totalSalary},${d.entries.length},${ps === 'paid' ? 'Paid' : 'Unpaid'}`);
                          });
                          const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `consolidated_${consolidatedMonth}.csv`; a.click();
                          URL.revokeObjectURL(url);
                          setToast({ message: t('csvDownloaded'), type: 'success' });
                        }} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">
                          <Icon name={BI.download} /> CSV Export
                        </button>
                      </div>
                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className={dark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}>
                            <tr>
                              <th className={cn('text-left px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>{t('users')}</th>
                              <th className={cn('text-right px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>Shift</th>
                              <th className={cn('text-right px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>OT</th>
                              <th className={cn('text-right px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>{t('shiftMoney')}</th>
                              <th className={cn('text-right px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>{t('otMoney')}</th>
                              <th className={cn('text-right px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>{t('csvTotal')}</th>
                              <th className={cn('text-center px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>{t('payment')}</th>
                              <th className={cn('text-center px-3 py-2 text-xs font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>{t('action')}</th>
                            </tr>
                          </thead>
                          <tbody className={dark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-50'}>
                            {consolidatedData.map(d => {
                              const ps = paymentStatuses[d.user.uid]?.[consolidatedMonth]?.status || 'unpaid';
                              return (
                                <tr key={d.user.uid} className={dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                                  <td className="px-3 py-2.5">
                                    <div className={cn('font-medium text-xs', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{d.user.displayName}</div>
                                    <div className="text-[10px] text-gray-400">{d.user.email}</div>
                                  </td>
                                  <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-gray-300' : 'text-gray-600')}>{d.summary.totalShift}h</td>
                                  <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-gray-300' : 'text-gray-600')}>{d.summary.totalOT}h</td>
                                  <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-gray-300' : 'text-gray-600')}>{formatTaka(d.summary.shiftMoney)}</td>
                                  <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-gray-300' : 'text-gray-600')}>{formatTaka(d.summary.otMoney)}</td>
                                  <td className={cn('text-right px-3 py-2.5 text-xs font-bold', dark ? 'text-emerald-400' : 'text-emerald-700')}>{formatTaka(d.summary.totalSalary)}</td>
                                  <td className="text-center px-3 py-2.5">
                                    <button onClick={() => handlePaymentToggle(d.user, consolidatedMonth)} className={cn('px-2 py-1 rounded-lg text-[10px] font-semibold', ps === 'paid' ? (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (dark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-600'))}>
                                      {ps === 'paid' ? 'Paid' : 'Unpaid'}
                                    </button>
                                  </td>
                                  <td className="text-center px-3 py-2.5">
                                    <button onClick={() => openPrintWindow(generateSalarySlipHTML({ entries: d.entries, displayName: d.user.displayName, email: d.user.email, hourlyRate: d.user.hourlyRate || 0, otRate: d.user.otRate || 0, monthKey: consolidatedMonth }))} className={cn('p-1.5 rounded text-gray-400 hover:text-blue-600', dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')} title={t('salarySlip')}>
                                      <Icon name={BI.fileText} className="text-sm" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className={cn('font-bold', dark ? 'bg-emerald-900/20' : 'bg-emerald-50')}>
                            <tr>
                              <td className={cn('px-3 py-2.5 text-xs', dark ? 'text-emerald-300' : 'text-emerald-800')}>{t('totalNUsers', { n: consolidatedData.length })}</td>
                              <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-emerald-300' : 'text-emerald-800')}>{consolidatedData.reduce((s, d) => s + d.summary.totalShift, 0)}h</td>
                              <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-emerald-300' : 'text-emerald-800')}>{consolidatedData.reduce((s, d) => s + d.summary.totalOT, 0)}h</td>
                              <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-emerald-300' : 'text-emerald-800')}>{formatTaka(consolidatedData.reduce((s, d) => s + d.summary.shiftMoney, 0))}</td>
                              <td className={cn('text-right px-3 py-2.5 text-xs', dark ? 'text-emerald-300' : 'text-emerald-800')}>{formatTaka(consolidatedData.reduce((s, d) => s + d.summary.otMoney, 0))}</td>
                              <td className={cn('text-right px-3 py-2.5 text-sm', dark ? 'text-emerald-300' : 'text-emerald-800')}>{formatTaka(consolidatedData.reduce((s, d) => s + d.summary.totalSalary, 0))}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {/* Mobile cards */}
                      <div className={dark ? 'md:hidden divide-y divide-gray-700' : 'md:hidden divide-y divide-gray-50'}>
                        {consolidatedData.map(d => {
                          const ps = paymentStatuses[d.user.uid]?.[consolidatedMonth]?.status || 'unpaid';
                          return (
                            <div key={d.user.uid} className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs', dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>{d.user.displayName?.charAt(0)?.toUpperCase()}</div>
                                  <div>
                                    <div className={cn('text-xs font-semibold', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{d.user.displayName}</div>
                                    <div className="text-[10px] text-gray-400">{t('xDays', { n: d.entries.length })}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={cn('text-sm font-bold', dark ? 'text-emerald-400' : 'text-emerald-700')}>{formatTaka(d.summary.totalSalary)}</div>
                                  <button onClick={() => handlePaymentToggle(d.user, consolidatedMonth)} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded', ps === 'paid' ? (dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (dark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-600'))}>{ps === 'paid' ? 'Paid' : 'Unpaid'}</button>
                                </div>
                              </div>
                              <div className={cn('flex gap-3 text-[10px]', dark ? 'text-gray-400' : 'text-gray-500')}>
                                <span>Shift: {d.summary.totalShift}h</span>
                                <span>OT: {d.summary.totalOT}h</span>
                                <span>Shift: {formatTaka(d.summary.shiftMoney)}</span>
                                <span>OT: {formatTaka(d.summary.otMoney)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ====== #27: ACTIVITY LOG TAB ====== */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={cn('font-semibold text-sm', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{t('recentActivity')}</h3>
                  <button onClick={loadActivityLogs} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">
                    <Icon name={BI.history} /> {t('refresh')}
                  </button>
                </div>
                {activityLogs.length === 0 ? (
                  <div className={cn('rounded-xl border shadow-sm p-8 text-center', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
                    <Icon name={BI.listTask} className={cn('text-4xl mx-auto mb-2', dark ? 'text-gray-600' : 'text-gray-200')} />
                    <p className={cn('text-sm', dark ? 'text-gray-400' : 'text-gray-500')}>{t('noActivityLog')}</p>
                  </div>
                ) : (
                  <div className={cn('rounded-xl border shadow-sm divide-y', dark ? 'bg-[#1E1E1E] border-gray-700 divide-gray-700' : 'bg-white border-gray-100 divide-gray-50')}>
                    {activityLogs.map(log => (
                      <div key={log.id} className="px-3 py-3 flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5', dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>{log.userName?.charAt(0)?.toUpperCase() || '?'}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-xs font-semibold', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{log.userName}</span>
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', actionColor(log.action))}>{actionLabel(log.action)}</span>
                          </div>
                          <p className={cn('text-[11px] mt-0.5', dark ? 'text-gray-400' : 'text-gray-500')}>{log.details}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleString('bn-BD')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ====== #26: BULK SALARY SLIP TAB ====== */}
            {activeTab === 'bulk-salary' && (
              <div className="space-y-4">
                <div className={cn('rounded-xl border shadow-sm p-6 text-center', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
                  <Icon name={BI.journalCheck} className="text-5xl text-emerald-300 mx-auto mb-3" />
                  <h3 className={cn('font-semibold text-sm mb-1', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{t('bulkSalarySlip')}</h3>
                  <p className={cn('text-xs mb-4', dark ? 'text-gray-400' : 'text-gray-500')}>{t('bulkSalaryDesc')}</p>
                  <div className={cn('border rounded-lg px-3 py-2 text-xs mb-4', dark ? 'bg-amber-900/20 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')}>
                    <Icon name={BI.exclamationTriangle} className="mr-1" /> {t('bulkSlipCount', { n: activeUsers })}
                  </div>
                  <button onClick={handleBulkSalarySlip} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all active:scale-95 text-sm flex items-center gap-2 mx-auto">
                    <Icon name={BI.journalCheck} /> {t('generateAllSlips')}
                  </button>
                </div>

                {/* Individual user salary slip buttons */}
                <div className={cn('rounded-xl border shadow-sm', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
                  <div className={cn('p-3 border-b', dark ? 'border-gray-700' : 'border-gray-100')}><h3 className={cn('font-semibold text-sm', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{t('slipPerUser')}</h3></div>
                  <div className={cn('divide-y max-h-80 overflow-y-auto', dark ? 'divide-gray-700' : 'divide-gray-50')}>
                    {users.filter(u => u.isActive).map(u => (
                      <div key={u.uid} className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full object-cover" /> : <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs', dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>{u.displayName?.charAt(0)?.toUpperCase()}</div>}
                          <div>
                            <div className={cn('text-xs font-medium', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>{u.displayName}</div>
                            <div className="text-[10px] text-gray-400">{u.email}</div>
                          </div>
                        </div>
                        <button onClick={async () => {
                          try {
                            const data = await getAdminOvertimeData(u.uid);
                            const months = Object.keys(data).sort().reverse();
                            if (months.length === 0) { setToast({ message: t('noData'), type: 'error' }); return; }
                            const latest = months[0];
                            openPrintWindow(generateSalarySlipHTML({ entries: data[latest], displayName: u.displayName, email: u.email, hourlyRate: u.hourlyRate || 0, otRate: u.otRate || 0, monthKey: latest }));
                          } catch { setToast({ message: t('slipGenFailed'), type: 'error' }); }
                        }} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95', dark ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100')}>
                          <Icon name={BI.fileText} className="mr-1" /> {t('viewSlip')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ====== SETTINGS TAB ====== */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Site Settings */}
                <div className={cn('rounded-xl border shadow-sm p-5', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
                  <h3 className={cn('font-semibold text-sm mb-4 flex items-center gap-2', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>
                    <Icon name={BI.globe} className="text-emerald-600" /> {t('websiteSettings')}
                  </h3>
                  <div className="space-y-4">
                    {/* Logo */}
                    <div className="flex items-center gap-4">
                      <div className={cn('w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl overflow-hidden shrink-0', siteLogo && 'p-0')}>
                        {siteLogo ? <img src={siteLogo} alt="Logo" className="w-full h-full object-cover" /> : 'OT'}
                      </div>
                      <div className="flex-1">
                        <label className={cn('block text-xs font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('websiteLogo')}</label>
                        <label className={cn('inline-flex items-center gap-1.5 px-4 py-2 border rounded-xl cursor-pointer text-sm font-medium transition-all active:scale-95', dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
                          {uploadingLogo ? <LoadingSpinner size="sm" /> : <Icon name={BI.upload} className="text-xs" />}
                          {t('logoUpload')}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {siteLogo && (
                          <button onClick={async () => { setSiteLogo(''); await setAppConfig({ siteLogo: '' }); }} className="text-xs text-red-500 mt-1 hover:underline">{t('clearLogo')}</button>
                        )}
                      </div>
                    </div>
                    {/* Logo URL Input */}
                    <div>
                      <label className={cn('block text-xs font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('saveLogoUrl')}</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className={cn('flex-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')}
                          placeholder="https://example.com/logo.png"
                          onKeyDown={(e) => e.key === 'Enter' && handleLogoUrlSave()}
                        />
                        <button
                          onClick={handleLogoUrlSave}
                          disabled={savingLogoUrl || !logoUrl.trim()}
                          className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95 text-sm shrink-0"
                        >
                          {savingLogoUrl ? <LoadingSpinner size="sm" /> : t('save')}
                        </button>
                      </div>
                      <p className={cn('text-[11px] mt-1', dark ? 'text-gray-500' : 'text-gray-400')}>{t('pasteImageUrl')}</p>
                    </div>
                    {/* Title */}
                    <div>
                      <label className={cn('block text-xs font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('siteTitle')}</label>
                      <input type="text" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} className={cn('w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder="Overtime Tracker BD" />
                    </div>
                    {/* Description */}
                    <div>
                      <label className={cn('block text-xs font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('siteDesc')}</label>
                      <input type="text" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} className={cn('w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder={t('siteDescPlaceholder')} />
                    </div>
                    {/* Footer */}
                    <div>
                      <label className={cn('block text-xs font-medium mb-1.5', dark ? 'text-gray-400' : 'text-gray-700')}>{t('footerText')}</label>
                      <input type="text" value={siteFooter} onChange={(e) => setSiteFooter(e.target.value)} className={cn('w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')} placeholder={t('footerTextPlaceholder')} />
                    </div>
                    <button onClick={handleSaveSiteSettings} disabled={savingSite} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95 text-sm">
                      {savingSite ? <LoadingSpinner size="sm" /> : t('saveSiteSettings')}
                    </button>
                  </div>
                </div>

                {/* ImgBB API Key */}
                <div className={cn('rounded-xl border shadow-sm p-5', dark ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-100')}>
                  <h3 className={cn('font-semibold text-sm mb-1 flex items-center gap-2', dark ? 'text-[#E0E0E0]' : 'text-gray-900')}>
                    <Icon name={BI.upload} className="text-emerald-600" /> ImgBB API Key
                  </h3>
                  <p className={cn('text-xs mb-4', dark ? 'text-gray-400' : 'text-gray-500')}>
                    {t('imgbbDesc')}
                    <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline ml-1">{t('getFreeApiKey')}</a>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={imgbbKey}
                      onChange={(e) => setImgbbKey(e.target.value)}
                      className={cn('flex-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm', dark ? 'border-gray-600 bg-[#2A2A2A] text-[#E0E0E0] placeholder:text-gray-500' : 'border-gray-200')}
                      placeholder={t('apiKeyPasteHere')}
                    />
                    <button
                      onClick={handleSaveImgbbKey}
                      disabled={savingImgbbKey || !imgbbKey.trim()}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95 text-sm shrink-0"
                    >
                      {savingImgbbKey ? <LoadingSpinner size="sm" /> : t('save')}
                    </button>
                  </div>
                  {imgbbKey.trim() && (
                    <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1">
                      <Icon name={BI.checkCircle} className="text-xs" /> {t('imgbbActive')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showRateModal && rateTargetUser && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowRateModal(false)} />
          <div className={cn('fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl p-5 max-w-sm mx-auto', dark ? 'bg-[#1E1E1E]' : 'bg-white')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('font-semibold text-sm flex items-center gap-2', txt)}><Icon name={BI.coin} className="text-purple-600" /> {t('setRateModal')}</h3>
              <button onClick={() => setShowRateModal(false)} className={cn('p-1.5 rounded-lg text-gray-400', hov)}><Icon name={BI.xLg} /></button>
            </div>
            <p className={cn('text-xs mb-3', txt2)}>{rateTargetUser.displayName} ({rateTargetUser.email})</p>
            <div className="space-y-3">
              <div>
                <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('basicRateHour')}</label>
                <input type="number" step="0.01" value={rateHourly} onChange={(e) => setRateHourly(parseFloat(e.target.value) || 0)} className={cn(adminInputCls.replace('focus:ring-emerald-500', 'focus:ring-purple-500'), 'text-center')} placeholder="৳" />
              </div>
              <div>
                <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('otRateHour')}</label>
                <input type="number" step="0.01" value={rateOt} onChange={(e) => setRateOt(parseFloat(e.target.value) || 0)} className={cn(adminInputCls.replace('focus:ring-emerald-500', 'focus:ring-purple-500'), 'text-center')} placeholder="৳" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRateModal(false)} className={cn('flex-1 py-2.5 border rounded-xl text-sm font-medium transition-all', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{t('cancel')}</button>
                <button onClick={handleAdminRateSet} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-all active:scale-95">{t('save')}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* #28: Admin Edit Entry Modal */}
      {adminEditEntry && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setAdminEditEntry(null)} />
          <div className={cn('fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl p-5 max-w-sm mx-auto', dark ? 'bg-[#1E1E1E]' : 'bg-white')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('font-semibold text-sm flex items-center gap-2', txt)}><Icon name={BI.pencil} className="text-blue-600" /> {t('editEntryModal')}</h3>
              <button onClick={() => setAdminEditEntry(null)} className={cn('p-1.5 rounded-lg text-gray-400', hov)}><Icon name={BI.xLg} /></button>
            </div>
            <p className={cn('text-xs mb-3', txt2)}>{t('dateLabel')} {adminEditEntry.date} | {selectedUser?.displayName}</p>
            <div className="space-y-3">
              <div>
                <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('shiftHoursCol')}</label>
                <input type="number" step="0.1" value={adminEditShift} onChange={(e) => setAdminEditShift(parseFloat(e.target.value) || 0)} className={cn(adminInputCls.replace('focus:ring-emerald-500', 'focus:ring-blue-500'), 'text-center')} />
              </div>
              <div>
                <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('otHoursCol')}</label>
                <input type="number" step="0.1" value={adminEditOt} onChange={(e) => setAdminEditOt(parseFloat(e.target.value) || 0)} className={cn(adminInputCls.replace('focus:ring-emerald-500', 'focus:ring-blue-500'), 'text-center')} />
              </div>
              <div>
                <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('note')}</label>
                <input type="text" value={adminEditNote} onChange={(e) => setAdminEditNote(e.target.value)} className={cn(adminInputCls.replace('focus:ring-emerald-500', 'focus:ring-blue-500'))} placeholder={t('optionalNote')} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAdminEditEntry(null)} className={cn('flex-1 py-2.5 border rounded-xl text-sm font-medium transition-all', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{t('cancel')}</button>
                <button onClick={handleAdminEditSave} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95">{t('update')}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* #28: Admin Add Entry Modal */}
      {showAdminAdd && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowAdminAdd(false)} />
          <div className={cn('fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl p-5 max-w-sm mx-auto', dark ? 'bg-[#1E1E1E]' : 'bg-white')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('font-semibold text-sm flex items-center gap-2', txt)}><Icon name={BI.plus} className="text-emerald-600" /> {t('newEntryModal')}</h3>
              <button onClick={() => setShowAdminAdd(false)} className={cn('p-1.5 rounded-lg text-gray-400', hov)}><Icon name={BI.xLg} /></button>
            </div>
            <p className={cn('text-xs mb-3', txt2)}>{t('addEntryFor', { name: selectedUser?.displayName || '' })}</p>
            <div className="space-y-3">
              <div>
                <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('date')}</label>
                <input type="date" value={adminAddDate} onChange={(e) => setAdminAddDate(e.target.value)} className={adminInputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('shiftHoursCol')}</label>
                  <input type="number" step="0.1" value={adminAddShift} onChange={(e) => setAdminAddShift(parseFloat(e.target.value) || 0)} className={cn(adminInputCls, 'text-center')} />
                </div>
                <div>
                  <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('otHoursCol')}</label>
                  <input type="number" step="0.1" value={adminAddOt} onChange={(e) => setAdminAddOt(parseFloat(e.target.value) || 0)} className={cn(adminInputCls, 'text-center')} />
                </div>
              </div>
              <div>
                <label className={cn('block text-xs font-medium mb-1', dark ? 'text-gray-400' : 'text-gray-700')}>{t('note')}</label>
                <input type="text" value={adminAddNote} onChange={(e) => setAdminAddNote(e.target.value)} className={adminInputCls} placeholder={t('optionalNote')} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdminAdd(false)} className={cn('flex-1 py-2.5 border rounded-xl text-sm font-medium transition-all', dark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{t('cancel')}</button>
                <button onClick={handleAdminAddEntry} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 active:scale-95">{t('add')}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmAction && <ConfirmDialog message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} dark={dark} />}
    </div>
  );
}

// ==================== MAIN APP =====================
function AppContent() {
  const t = useT();
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeView, setActiveView] = useState<'user' | 'admin' | 'profile' | 'settings' | 'guide'>('user');
  const [dark, setDark] = useDarkMode();
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  // Feature #16: Offline indicator + sync
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsub = subscribeAppConfig((cfg) => {
      setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...cfg } as SiteConfig);
    });
    return unsub;
  }, []);

  // Online/Offline listener + অটো সিঙ্ক
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      // পেন্ডিং অফলাইন এন্ট্রি অটো সিঙ্ক
      const count = getPendingCount();
      if (count > 0) {
        setSyncing(true);
        try {
          const result = await syncOfflineQueue();
          if (result.success > 0) {
            setSyncToast({ message: t('syncSuccess', { n: result.success }), type: 'success' });
          }
          if (result.failed > 0) {
            setSyncToast({ message: t('syncFailed', { n: result.failed }), type: 'error' });
          }
        } catch {
          setSyncToast({ message: t('syncError'), type: 'error' });
        }
        setSyncing(false);
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // Subscribe to profile in real-time
  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      const unsubscribe = subscribeUserProfile(user.uid, (p) => {
        setProfile(p);
        setProfileLoading(false);
      });
      return () => unsubscribe();
    }
    setProfile(null);
    setProfileLoading(false);
    return undefined;
  }, [user]);

  if (loading || (user && profileLoading)) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', dark ? 'bg-[#121212]' : 'bg-gray-50')}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className={cn('text-sm mt-4', dark ? 'text-gray-400' : 'text-gray-500')}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage siteConfig={siteConfig} />;
  }

  const handleLogout = async () => {
    try { await signOut(); } catch { /* ignore */ }
  };

  return (
    <div className={cn('min-h-screen', dark ? 'bg-[#121212]' : 'bg-[#F8F9FA]')}>
      {/* সিঙ্ক ইন্ডিকেটর */}
      {syncing && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-blue-500 text-white text-center text-xs font-medium py-1.5">
          <Icon name={BI.arrowClockwise} className="mr-1 animate-spin" />
          {t('syncingData')}
        </div>
      )}
      {/* অফলাইন ইন্ডিকেটর */}
      {!isOnline && !syncing && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white text-center text-xs font-medium py-1.5">
          <Icon name={BI.wifiOff || 'bi-wifi-off'} className="mr-1" />
          {t('noInternet')}
          {getPendingCount() > 0 && <span className="ml-1 opacity-90">({t('pending', { n: getPendingCount() })})</span>}
        </div>
      )}
      {syncToast && <Toast message={syncToast.message} type={syncToast.type} onClose={() => setSyncToast(null)} />}
      {activeView === 'profile' ? (
        <ProfileSection user={user} profile={profile} dark={dark} siteConfig={siteConfig} onShowGuide={() => setActiveView('guide')} />
      ) : activeView === 'guide' ? (
        <UserGuidePage dark={dark} onBack={() => setActiveView('profile')} />
      ) : activeView === 'admin' && profile.role === 'admin' ? (
        <AdminPanel user={user} profile={profile} dark={dark} siteConfig={siteConfig} />
      ) : activeView === 'settings' ? (
        <SettingsPage user={user} profile={profile} dark={dark} setDark={setDark} siteConfig={siteConfig} />
      ) : (
        <UserDashboard user={user} profile={profile} onLogout={handleLogout} siteConfig={siteConfig} isOnline={isOnline} />
      )}

      {activeView !== 'guide' && siteConfig.siteFooter && (
        <div className={cn('fixed bottom-[52px] left-0 right-0 text-center py-1.5 z-20 pointer-events-none', dark ? 'bg-[#121212]' : 'bg-[#F8F9FA]')}>
          <p className={cn('text-[10px]', dark ? 'text-gray-600' : 'text-gray-400')}>{siteConfig.siteFooter}</p>
        </div>
      )}

      {activeView !== 'guide' && (
      <nav className={cn("fixed bottom-0 left-0 right-0 border-t z-30 safe-area-bottom", dark ? "bg-[#1E1E1E] border-gray-700" : "bg-white border-gray-200")}>
        <div className="max-w-7xl mx-auto flex">
          <button onClick={() => setActiveView('user')} className={cn('flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors no-select active:scale-95', activeView === 'user' ? 'text-emerald-600' : 'text-gray-400')}>
            <Icon name={BI.house} className="text-lg" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          <button onClick={() => setActiveView('profile')} className={cn('flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors no-select active:scale-95', activeView === 'profile' ? 'text-emerald-600' : 'text-gray-400')}>
            <Icon name={BI.personBadge} className="text-lg" />
            <span className="text-[10px] font-medium">{t('profile')}</span>
          </button>
          {profile.role === 'admin' && (
            <button onClick={() => setActiveView('admin')} className={cn('flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors no-select active:scale-95', activeView === 'admin' ? 'text-emerald-600' : 'text-gray-400')}>
              <Icon name={BI.shieldCheck} className="text-lg" />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          )}
          <button onClick={() => setActiveView('settings')} className={cn('flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors no-select active:scale-95', activeView === 'settings' ? 'text-emerald-600' : 'text-gray-400')}>
            <Icon name={BI.gear} className="text-lg" />
            <span className="text-[10px] font-medium">{t('settings')}</span>
          </button>
          <button onClick={handleLogout} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-gray-400 hover:text-red-500 transition-colors no-select active:scale-95">
            <Icon name={BI.boxArrowRight} className="text-lg" />
            <span className="text-[10px] font-medium">{t('logout')}</span>
          </button>
        </div>
      </nav>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}
