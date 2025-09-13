import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '@/lib/api';

interface Stat {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}

// Componente Eventos - Aniversários com alertas
function EventosContent({ isLoaded }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [leadDays, setLeadDays] = useState(1); // 1 dia antes
  const [leadHours, setLeadHours] = useState(3); // 3 horas antes
  const [events, setEvents] = useState<any[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showBirthdayForm, setShowBirthdayForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', datetime: '', description: '', memberId: '' });
  const [birthdayMemberId, setBirthdayMemberId] = useState('');
  const [birthdayDate, setBirthdayDate] = useState('');

  // Carregar membros com birthDate
  const loadMembers = async () => {
    try {
      const res = await api.get('/members', { params: { page: 1, limit: 1000 } });
      const items = res.data?.members ?? res.data ?? [];
      const mapped = items.map((m: any) => ({
        id: String(m.id),
        name: m.name,
        birthDate: m.birthDate,
      }));
      setMembers(mapped);
    } catch (e) {
      console.error('Falha ao carregar membros', e);
    }
  };

  const notifyEvent = async (ev: any, when: Date) => {
    const ok = await requestPermission();
    const title = `🔔 Evento: ${ev.title}`;
    const body = `${when.toLocaleString('pt-BR')}${ev.memberId ? ' • membro vinculado' : ''}`;
    try {
      if (ok && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' });
      } else if (ok) {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch {}
    playBeep();
  };

  // Helpers
  const getNextBirthday = (birthDateValue: any) => {
    try {
      const s = String(birthDateValue || '');
      const iso = s.length >= 10 ? s.substring(0, 10) : '';
      const [y, m, d] = iso.split('-').map((n) => parseInt(n));
      if (!m || !d) {
        return { next: new Date(0), ageNext: 0, diffMs: Infinity, diffDays: Infinity } as any;
      }
      const now = new Date();
      const year = now.getFullYear();
      let next = new Date(year, (m - 1), d, 9, 0, 0); // 09:00 horário local
      if (next.getTime() < now.getTime()) {
        next = new Date(year + 1, (m - 1), d, 9, 0, 0);
      }
      const birthYear = isNaN(y) ? undefined : y;
      const ageNext = birthYear ? (next.getFullYear() - birthYear) : 0;
      const diffMs = next.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      return { next, ageNext, diffMs, diffDays };
    } catch {
      return { next: new Date(0), ageNext: 0, diffMs: Infinity, diffDays: Infinity } as any;
    }
  };

  const requestPermission = async () => {
    try {
      if (typeof window === 'undefined') return false;
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  };

  const playBeep = () => {
    try {
      const ac = new (window as any).AudioContext();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ac.currentTime);
      gain.gain.setValueAtTime(0.001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.1, ac.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + 0.5);
    } catch {}
  };

  const notifyBirthday = async (member: any, nextDate: Date, ageNext: number) => {
    const ok = await requestPermission();
    const title = `🎉 Aniversário de ${member.name}`;
    const body = `Amanhã/daqui a pouco: ${nextDate.toLocaleDateString('pt-BR')} • fará ${ageNext} anos`;
    try {
      if (ok && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' });
      } else if (ok) {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch {}
    playBeep();
  };

  // Checagem periódica
  useEffect(() => {
    if (!alertsEnabled) return;
    const check = () => {
      const now = new Date();
      const leadDayMs = leadDays * 24 * 60 * 60 * 1000;
      const leadHoursMs = leadHours * 60 * 60 * 1000;
      const windowMs = Math.max(leadDayMs, leadHoursMs);
      members.forEach((m) => {
        if (!m.birthDate) return; // pular membros sem data de nascimento
        const { next, ageNext, diffMs } = getNextBirthday(m.birthDate);
        if (diffMs <= windowMs && diffMs > 0) {
          const key = `bday-${m.id}-${next.getFullYear()}`;
          const already = localStorage.getItem(key);
          if (!already) {
            notifyBirthday(m, next, ageNext);
            localStorage.setItem(key, '1');
          }
        }
      });
      // Eventos genéricos
      events.forEach((ev) => {
        const when = new Date(ev.datetime);
        const diffMs = when.getTime() - now.getTime();
        if (diffMs <= windowMs && diffMs > 0) {
          const dayKey = when.toISOString().split('T')[0];
          const key = `evt-${ev.id}-${dayKey}`;
          const already = localStorage.getItem(key);
          if (!already) {
            notifyEvent(ev, when);
            localStorage.setItem(key, '1');
          }
        }
      });
    };
    check();
    const id = setInterval(check, 60 * 1000); // a cada minuto
    return () => clearInterval(id);
  }, [alertsEnabled, members, events, leadDays, leadHours]);

  useEffect(() => {
    setAlertsEnabled(localStorage.getItem('alertsEnabled') === '1');
    loadMembers();
    loadEvents();
  }, []);

  // Carregar eventos do backend
  const loadEvents = async () => {
    try {
      const res = await api.get('/events', { params: { from: new Date().toISOString(), limit: 100 } });
      const list = res.data?.events ?? res.data ?? [];
      setEvents(list);
    } catch (e) {
      console.error('Falha ao carregar eventos', e);
    }
  };

  const addGenericEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: newEvent.title.trim(),
        datetime: newEvent.datetime,
        description: newEvent.description || undefined,
        memberId: newEvent.memberId || undefined,
      };
      await api.post('/events', payload);
      await loadEvents();
      setNewEvent({ title: '', datetime: '', description: '', memberId: '' });
      setShowEventForm(false);
    } catch (err) {
      console.error('Falha ao criar evento', err);
      if (typeof window !== 'undefined') alert('Falha ao criar evento.');
    }
  };

  const saveMemberBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const m = members.find((x) => String(x.id) === String(birthdayMemberId));
      if (!m) return;
      await api.put(`/members/${birthdayMemberId}`, { name: m.name, birthDate: birthdayDate });
      await loadMembers();
      setBirthdayMemberId('');
      setBirthdayDate('');
      setShowBirthdayForm(false);
      if (typeof window !== 'undefined') alert('Aniversário salvo com sucesso!');
    } catch (err) {
      console.error('Falha ao salvar aniversário', err);
      if (typeof window !== 'undefined') alert('Falha ao salvar aniversário.');
    }
  };

  const clearMemberBirthday = async (member: any) => {
    try {
      if (typeof window !== 'undefined') {
        const ok = window.confirm(`Remover data de aniversário de ${member.name}?`);
        if (!ok) return;
      }
      await api.put(`/members/${member.id}`, { name: member.name, birthDate: null });
      await loadMembers();
    } catch (err) {
      console.error('Falha ao remover aniversário', err);
      if (typeof window !== 'undefined') alert('Falha ao remover aniversário.');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      if (typeof window !== 'undefined') {
        const ok = window.confirm('Remover este evento?');
        if (!ok) return;
      }
      await api.delete(`/events/${id}`);
      await loadEvents();
    } catch (err) {
      console.error('Falha ao deletar evento', err);
      if (typeof window !== 'undefined') alert('Falha ao deletar evento.');
    }
  };

  const upcoming = members
    .filter((m) => !!m.birthDate)
    .map((m) => ({ m, info: getNextBirthday(m.birthDate) }))
    .sort((a, b) => a.info.diffMs - b.info.diffMs)
    .filter((x) => x.info.diffMs >= 0 && x.info.diffDays <= 60)
    .slice(0, 20);

  return (
    <div className="space-y-10">
      <div className={`fade-in-up transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-black flex items-center gap-3">
            <span className="text-4xl">📅</span>
            Eventos & Aniversários
          </h2>
          <div className="flex items-center gap-4 w-full justify-end">
            <div className="flex items-center gap-3 mr-4">
              <label className="flex items-center gap-2 text-sm text-black">
                Avisar
                <select value={leadDays} onChange={(e) => setLeadDays(parseInt(e.target.value))} className="border-2 border-gray-200 rounded p-1">
                  <option value={2}>2 dias antes</option>
                  <option value={1}>1 dia antes</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-black">
                e
                <select value={leadHours} onChange={(e) => setLeadHours(parseInt(e.target.value))} className="border-2 border-gray-200 rounded p-1">
                  <option value={6}>6 horas antes</option>
                  <option value={3}>3 horas antes</option>
                  <option value={1}>1 hora antes</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={async () => {
                  if (alertsEnabled) {
                    setAlertsEnabled(false);
                    if (typeof window !== 'undefined') localStorage.removeItem('alertsEnabled');
                    return;
                  }
                  const ok = await requestPermission();
                  if (ok) {
                    setAlertsEnabled(true);
                    if (typeof window !== 'undefined') localStorage.setItem('alertsEnabled', '1');
                  } else {
                    alert('Permissão de notificação negada pelo navegador.');
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold ${alertsEnabled ? 'bg-green-600 text-white' : 'bg-black text-white'}`}
              >
                {alertsEnabled ? 'Desativar Alertas' : 'Ativar Alertas'}
              </button>
              <button type="button"
                onClick={() => { setShowEventForm(true); setShowBirthdayForm(false); }}
                className="premium-button"
              >
                ➕ Adicionar Evento
              </button>
              <button type="button"
                onClick={() => { setShowBirthdayForm(true); setShowEventForm(false); }}
                className="premium-button"
              >
                🎂 Cadastrar Aniversário
              </button>
            </div>
          </div>
        </div>

        {showEventForm && (
          <div className="sidebar-card fade-in-up">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">✨</span>
              Novo Evento
            </h3>
            <form onSubmit={addGenericEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Título</label>
                <input type="text" value={newEvent.title} onChange={(e)=>setNewEvent({...newEvent,title:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Data e Hora</label>
                <input type="datetime-local" value={newEvent.datetime} onChange={(e)=>setNewEvent({...newEvent,datetime:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Vincular Membro (opcional)</label>
                <select value={newEvent.memberId} onChange={(e)=>setNewEvent({...newEvent,memberId:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none">
                  <option value="">— Nenhum —</option>
                  {members.map((m:any)=> (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Descrição</label>
                <textarea value={newEvent.description} onChange={(e)=>setNewEvent({...newEvent,description:e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" rows={3} />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button type="submit" className="premium-button flex-1">💾 Salvar Evento</button>
                <button type="button" onClick={()=>{ setShowEventForm(false); setNewEvent({ title:'',datetime:'',description:'',memberId:''}); }} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors">❌ Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {showBirthdayForm && (
          <div className="sidebar-card fade-in-up">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">🎂</span>
              Cadastrar Aniversário de Membro
            </h3>
            <form onSubmit={saveMemberBirthday} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Membro</label>
                <select value={birthdayMemberId} onChange={(e)=>setBirthdayMemberId(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" required>
                  <option value="">Selecione um membro</option>
                  {members.map((m:any)=> (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Data de Nascimento</label>
                <input type="date" value={birthdayDate} onChange={(e)=>setBirthdayDate(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" required />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button type="submit" className="premium-button flex-1">💾 Salvar</button>
                <button type="button" onClick={()=>{ setShowBirthdayForm(false); setBirthdayMemberId(''); setBirthdayDate(''); }} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors">❌ Cancelar</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="beautiful-card">
            <div className="stat-icon-container">🎂</div>
            <h3 className="stat-title">Próximos 7 dias</h3>
            <div className="stat-value">{upcoming.filter(x => x.info.diffDays <= 7).length}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">🗓️</div>
            <h3 className="stat-title">Próximos 30 dias</h3>
            <div className="stat-value">{upcoming.filter(x => x.info.diffDays <= 30).length}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">🔔</div>
            <h3 className="stat-title">Alertas</h3>
            <div className="stat-value">{alertsEnabled ? 'Ativos' : 'Inativos'}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
        </div>
      </div>

      <div className={`main-chart-container transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              Próximos Aniversários (60 dias)
            </h3>
            <p className="chart-subtitle">Lista dos membros com aniversário mais próximo</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-4 font-bold text-black">Membro</th>
                <th className="text-left p-4 font-bold text-black">Data</th>
                <th className="text-left p-4 font-bold text-black">Fará</th>
                <th className="text-left p-4 font-bold text-black">Faltam</th>
                <th className="text-left p-4 font-bold text-black">Ações</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(({ m, info }) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="p-4 font-semibold text-black">{m.name}</td>
                  <td className="p-4 text-gray-600">{info.next.toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-gray-600">{info.ageNext} anos</td>
                  <td className="p-4 text-gray-600">{info.diffDays} dias</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => clearMemberBirthday(m)}
                      className="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                      title="Remover aniversário"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {upcoming.length === 0 && (
          <div className="text-center py-6 text-sm text-gray-500">
            Nenhum aniversário nos próximos 60 dias. Assim que a data estiver a até 60 dias, aparecerá aqui.
          </div>
        )}
      </div>

      {/* Lista de Próximos Eventos */}
      <div className={`main-chart-container transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title flex items-center gap-3">
              <span className="text-3xl">📆</span>
              Próximos Eventos
            </h3>
            <p className="chart-subtitle">Eventos cadastrados para as próximas datas</p>
          </div>
        </div>
        {(() => {
          const list = events
            .map((ev: any) => ({
              ev,
              when: new Date(ev.datetime),
              memberName: (members.find((m) => String(m.id) === String(ev.memberId))?.name) || '—',
            }))
            .filter((x) => x.when.getTime() > Date.now())
            .sort((a, b) => a.when.getTime() - b.when.getTime());
          return (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-4 font-bold text-black">Título</th>
                    <th className="text-left p-4 font-bold text-black">Data/Hora</th>
                    <th className="text-left p-4 font-bold text-black">Membro</th>
                    <th className="text-left p-4 font-bold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ ev, when, memberName }) => (
                    <tr key={ev.id} className="border-b border-gray-100">
                      <td className="p-4 font-semibold text-black">{ev.title}</td>
                      <td className="p-4 text-gray-600">{when.toLocaleString('pt-BR')}</td>
                      <td className="p-4 text-gray-600">{memberName}</td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => deleteEvent(ev.id)}
                          className="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                          title="Excluir evento"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500">Nenhum evento futuro cadastrado.</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

interface DashboardProps {
  stats: Stat[];
  isLoaded: boolean;
  transactions: any[];
  showTransactionForm: boolean;
  setShowTransactionForm: (show: boolean) => void;
  editingTransaction: any;
  setEditingTransaction: (transaction: any) => void;
  newTransaction: any;
  setNewTransaction: (transaction: any) => void;
  addTransaction: (e: React.FormEvent) => void;
  editTransaction: (transaction: any) => void;
  deleteTransaction: (id: any) => void;
  toggleStatus: (id: any) => void;
  membersOptions: any[];
  categoriesOptions: any[];
  recentActivities: any[];
  overview: any;
  typeDistribution: any[];
  monthlyEvolution: any[];
  paymentMethodDistribution: any[];
}

// Helpers de mapeamento para alinhar enums do backend com a UI local
const mapTypeFromBackend = (type: string) => {
  switch (type) {
    case 'DIZIMO':
      return 'dizimo';
    case 'OFERTA':
      return 'oferta';
    default:
      return 'oferta';
  }
};

// Mapeia rótulos da UI para enums do backend
const mapMethodToBackend = (label: string) => {
  switch (label) {
    case 'PIX':
      return 'PIX';
    case 'Dinheiro':
      return 'DINHEIRO';
    case 'Cartão Crédito':
      return 'CARTAO_CREDITO';
    case 'Cartão Débito':
      return 'CARTAO_DEBITO';
    case 'Cartão':
      return 'CARTAO_CREDITO';
    case 'Transferência':
      return 'TRANSFERENCIA';
    case 'Cheque':
      return 'CHEQUE';
    case 'Boleto':
      return 'BOLETO';
    default:
      return label;
  }
};

const mapMethodFromBackend = (method: string) => {
  switch (method) {
    case 'PIX':
      return 'PIX';
    case 'DINHEIRO':
      return 'Dinheiro';
    case 'CARTAO_CREDITO':
      return 'Cartão Crédito';
    case 'CARTAO_DEBITO':
      return 'Cartão Débito';
    case 'TRANSFERENCIA':
      return 'Transferência';
    case 'CHEQUE':
      return 'Cheque';
    case 'BOLETO':
      return 'Boleto';
    default:
      return method;
  }
};

export default function Home() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [brandingName, setBrandingName] = useState('');
  const [membersCount, setMembersCount] = useState(0);
  const [membersOptions, setMembersOptions] = useState<any[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<any[]>([]);
  const [dashboardOverview, setDashboardOverview] = useState<any>(null);
  const [dashboardTypeDist, setDashboardTypeDist] = useState<any[]>([]);
  const [dashboardRecent, setDashboardRecent] = useState<any[]>([]);
  const [dashboardMonthlyEvolution, setDashboardMonthlyEvolution] = useState<any[]>([]);
  const [dashboardPaymentMethodDist, setDashboardPaymentMethodDist] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [newTransaction, setNewTransaction] = useState({
    type: 'dizimo',
    member: '',
    memberId: '',
    categoryId: '',
    amount: '',
    method: 'PIX'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.replace('/login');
      }
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // remover cookie de sessão
      document.cookie = 'token=; path=/; max-age=0';
    }
    router.push('/login');
  };

  const getTypeSum = (type: string) => {
    const item = dashboardTypeDist?.find((x: any) => x.type === type);
    return Number(item?._sum?.amount || 0);
  };
  const dizimoMonthly = getTypeSum('DIZIMO');
  const ofertaMonthly = getTypeSum('OFERTA');
  const stats: Stat[] = [
    { title: 'Dízimos', value: `R$ ${dizimoMonthly.toFixed(2)}`, change: '', icon: '💎' },
    { title: 'Ofertas', value: `R$ ${ofertaMonthly.toFixed(2)}`, change: '', icon: '🎁' },
    { title: 'Membros', value: String(dashboardOverview?.totalMembers ?? membersCount), change: '', icon: '👥' },
    { title: 'Transações', value: String(dashboardOverview?.monthlyCount ?? transactions.length), change: '', icon: '💳' }
  ];

  // Função utilitária para recarregar contribuições do backend
  const loadContributions = async () => {
    try {
      const res = await api.get('/contributions', { params: { limit: 100 } });
      const items = res.data?.contributions ?? res.data ?? [];
      const mapped = items.map((c: any) => ({
        id: c.id,
        type: mapTypeFromBackend(c.type),
        member: c.member?.name || '—',
        memberId: c.member?.id || '',
        categoryId: c.category?.id || '',
        categoryName: c.category?.name || '',
        amount: Number(c.amount) || 0,
        date: c.date,
        method: mapMethodFromBackend(c.paymentMethod),
        status: c.verified ? 'confirmado' : 'pendente',
      }));
      setTransactions(mapped);
    } catch (err) {
      console.error('Falha ao carregar contribuições', err);
    }
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        memberId: newTransaction.memberId,
        categoryId: newTransaction.categoryId,
        type: newTransaction.type === 'dizimo' ? 'DIZIMO' : 'OFERTA',
        amount: parseFloat(newTransaction.amount),
        paymentMethod: mapMethodToBackend(newTransaction.method),
        date: new Date().toISOString(),
      } as any;

      if (editingTransaction) {
        await api.put(`/contributions/${(editingTransaction as any).id}` as string, payload);
      } else {
        await api.post('/contributions', payload);
      }
      await loadContributions();
      setEditingTransaction(null as any);
      setNewTransaction({ type: 'dizimo', member: '', memberId: '', categoryId: '', amount: '', method: 'PIX' });
      setShowTransactionForm(false);
    } catch (err) {
      console.error('Erro ao salvar contribuição', err);
    }
  };

  const deleteTransaction = async (id: any) => {
    try {
      await api.delete(`/contributions/${id}`);
      await loadContributions();
    } catch (err) {
      console.error('Erro ao deletar contribuição', err);
    }
  };

  const editTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setNewTransaction({
      type: transaction.type,
      member: transaction.member,
      memberId: transaction.memberId || '',
      categoryId: transaction.categoryId || '',
      amount: transaction.amount.toString(),
      method: transaction.method === 'Cartão' ? 'Cartão Crédito' : transaction.method
    });
    setShowTransactionForm(true);
  };

  const toggleStatus = async (id: any) => {
    try {
      const current = transactions.find(t => t.id === id);
      const nextVerified = current?.status !== 'confirmado';
      await api.patch(`/contributions/${id}/verify`, { verified: nextVerified });
      setTransactions(transactions.map(t => t.id === id ? { ...t, status: nextVerified ? 'confirmado' : 'pendente' } : t));
    } catch (err) {
      console.error('Erro ao alterar verificação', err);
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'dizimos', name: 'Dízimos', icon: '💎' },
    { id: 'ofertas', name: 'Ofertas', icon: '🎁' },
    { id: 'eventos', name: 'Eventos', icon: '📅' },
    { id: 'membros', name: 'Membros', icon: '👥' },
    { id: 'relatorios', name: 'Relatórios', icon: '📈' },
    { id: 'configuracoes', name: 'Configurações', icon: '⚙️' }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Carregar nome da igreja do localStorage para exibir no cabeçalho
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('config');
        if (raw) {
          const cfg = JSON.parse(raw);
          setBrandingName(cfg?.churchName || '');
        }
      } catch {}
    }
  }, []);

  // Buscar contagem real de membros
  useEffect(() => {
    async function loadMembersCount() {
      try {
        const res = await api.get('/members', { params: { page: 1, limit: 1 } });
        const total = res.data?.pagination?.total ?? 0;
        setMembersCount(Number(total) || 0);
      } catch (err) {
        console.error('Falha ao carregar quantidade de membros', err);
      }
    }
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      loadMembersCount();
    }
  }, []);

  // Buscar contribuições reais do backend e popular a tabela
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      loadContributions();
    }
  }, []);

  // Carregar estatísticas do dashboard
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.get('/dashboard/stats');
        const d = res.data || {};
        setDashboardOverview(d.overview || null);
        setDashboardTypeDist(d.charts?.typeDistribution || []);
        setDashboardRecent(d.recentContributions || []);
        setDashboardMonthlyEvolution(d.charts?.monthlyEvolution || []);
        setDashboardPaymentMethodDist(d.charts?.paymentMethodDistribution || []);
        if (d.overview?.totalMembers != null) setMembersCount(Number(d.overview.totalMembers));
      } catch (err) {
        console.error('Falha ao carregar estatísticas do dashboard', err);
      }
    }
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      loadStats();
    }
  }, []);

  const recentActivities = dashboardRecent.map((c: any) => ({
    user: c.member?.name || '—',
    action: mapTypeFromBackend(c.type) === 'dizimo' ? 'Contribuiu com dízimo' : 'Fez uma oferta',
    amount: `R$ ${(Number(c.amount) || 0).toFixed(2)}`,
    time: new Date(c.date).toLocaleString('pt-BR'),
    type: mapTypeFromBackend(c.type) === 'dizimo' ? 'tithes' : 'offering',
  }));

  // Função para carregar opções de membros e categorias
  const loadOptions = async () => {
    try {
      const [m, c] = await Promise.all([
        api.get('/members', { params: { page: 1, limit: 500 } }),
        api.get('/categories'),
      ]);
      const ms = (m.data?.members ?? m.data ?? []).map((x: any) => ({ id: x.id, name: x.name }));
      const cs = (c.data ?? []).map((x: any) => ({ id: x.id, name: x.name }));
      setMembersOptions(ms);
      setCategoriesOptions(cs);
    } catch (err) {
      console.error('Falha ao carregar opções', err);
    }
  };

  // Criar estados para controlar formulários de dízimos e ofertas
  const [showDizimosForm, setShowDizimosForm] = useState(false);
  const [showOfertasForm, setShowOfertasForm] = useState(false);

  // Não carregar opções automaticamente - deixar lista vazia até criar membros

  return (
    <>
      <Head>
        <title>Sistema de Gestão Eclesiástica</title>
        <meta name="description" content="Sistema completo para gestão de igreja" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-white">
        
        {/* Header com Design Moderno */}
        <header className="modern-header">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="church-logo">
                  <span>✝️</span>
                </div>
                <div>
                  <h1 className="church-title">{brandingName || 'Sistema Eclesiástico'}</h1>
                  <p className="church-subtitle">Sistema de Gestão Completo</p>
                </div>
              </div>
              <div className="text-white text-right">
                <div className="church-subtitle">Bem-vindo</div>
                <div className="text-lg font-bold">Administrador</div>
                <button
                  onClick={handleLogout}
                  className="mt-2 px-4 py-2 bg-red-600 rounded-lg text-white font-semibold hover:bg-red-700 transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navegação com Abas Elegantes */}
        <nav className="tab-navigation">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`elegant-tab ${
                    activeTab === tab.id ? 'active' : ''
                  }`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content com Design Bonito */}
        <main className="bg-white min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-10">
            {activeTab === 'dashboard' && (
              <DashboardContent 
                stats={stats}
                isLoaded={isLoaded}
                transactions={transactions}
                showTransactionForm={showTransactionForm}
                setShowTransactionForm={setShowTransactionForm}
                editingTransaction={editingTransaction}
                setEditingTransaction={setEditingTransaction}
                newTransaction={newTransaction}
                setNewTransaction={setNewTransaction}
                addTransaction={addTransaction}
                editTransaction={editTransaction}
                deleteTransaction={deleteTransaction}
                toggleStatus={toggleStatus}
                membersOptions={membersOptions}
                categoriesOptions={categoriesOptions}
                recentActivities={recentActivities}
                overview={dashboardOverview}
                typeDistribution={dashboardTypeDist}
                monthlyEvolution={dashboardMonthlyEvolution}
                paymentMethodDistribution={dashboardPaymentMethodDist}
              />
            )}
            {activeTab === 'dizimos' && (
              <DizimosContent 
                transactions={transactions.filter(t => t.type === 'dizimo')}
                showForm={showTransactionForm}
                setShowForm={setShowTransactionForm}
                editingTransaction={editingTransaction}
                newTransaction={newTransaction}
                setNewTransaction={setNewTransaction}
                addTransaction={addTransaction}
                editTransaction={editTransaction}
                deleteTransaction={deleteTransaction}
                toggleStatus={toggleStatus}
                isLoaded={isLoaded}
                membersOptions={membersOptions}
                categoriesOptions={categoriesOptions}
                loadOptions={loadOptions}
              />
            )}
            {activeTab === 'ofertas' && (
              <OfertasContent 
                transactions={transactions.filter(t => t.type === 'oferta')}
                showForm={showTransactionForm}
                setShowForm={setShowTransactionForm}
                editingTransaction={editingTransaction}
                newTransaction={newTransaction}
                setNewTransaction={setNewTransaction}
                addTransaction={addTransaction}
                editTransaction={editTransaction}
                deleteTransaction={deleteTransaction}
                toggleStatus={toggleStatus}
                isLoaded={isLoaded}
                membersOptions={membersOptions}
                categoriesOptions={categoriesOptions}
                loadOptions={loadOptions}
              />
            )}
            {activeTab === 'eventos' && (
              <EventosContent isLoaded={isLoaded} />
            )}
            {activeTab === 'membros' && (
              <MembrosContent isLoaded={isLoaded} />
            )}
            {activeTab === 'relatorios' && (
              <RelatoriosContent transactions={transactions} isLoaded={isLoaded} />
            )}
            {activeTab === 'configuracoes' && (
              <ConfiguracoesContent isLoaded={isLoaded} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// Componente Dízimos - Sistema CRUD Completo
function DizimosContent({ 
  transactions, 
  showForm, 
  setShowForm,
  editingTransaction,
  newTransaction,
  setNewTransaction,
  addTransaction,
  editTransaction,
  deleteTransaction,
  toggleStatus,
  isLoaded,
  membersOptions,
  categoriesOptions,
  loadOptions
}: any) {
  const dizimos = transactions;
  const totalDizimos = dizimos.filter((d: any) => d.status === 'confirmado').reduce((sum: number, d: any) => sum + d.amount, 0);
  const dizimosPendentes = dizimos.filter((d: any) => d.status === 'pendente').length;
  
  return (
    <div className="space-y-8">
      <div className={`fade-in-up transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-black flex items-center gap-3">
            <span className="text-4xl">💎</span>
            Gestão de Dízimos
          </h2>
          <button 
            onClick={() => {
              loadOptions(); // Carregar membros e categorias ao abrir formulário
              setNewTransaction({ type: 'dizimo', member: '', memberId: '', categoryId: '', amount: '', method: 'PIX' });
              setShowForm(true);
            }}
            className="premium-button"
          >
            ➕ Novo Dízimo
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="beautiful-card">
            <div className="stat-icon-container">💰</div>
            <h3 className="stat-title">Total Arrecadado</h3>
            <div className="stat-value">R$ {totalDizimos.toFixed(2)}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">📊</div>
            <h3 className="stat-title">Total de Registros</h3>
            <div className="stat-value">{dizimos.length}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">⏳</div>
            <h3 className="stat-title">Pendentes</h3>
            <div className="stat-value">{dizimosPendentes}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="sidebar-card fade-in-up">
          <h3 className="sidebar-title">
            <span className="sidebar-icon">✨</span>
            {editingTransaction ? 'Editar Dízimo' : 'Novo Dízimo'}
          </h3>
          <form onSubmit={addTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Membro</label>
              <select
                value={newTransaction.memberId}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = (membersOptions || []).find((m: any) => m.id === id)?.name || '';
                  setNewTransaction({ ...newTransaction, memberId: id, member: name });
                }}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              >
                <option value="">Selecione um membro</option>
                {membersOptions?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Categoria</label>
              <select
                value={newTransaction.categoryId}
                onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categoriesOptions?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Método</label>
              <select
                value={newTransaction.method}
                onChange={(e) => setNewTransaction({...newTransaction, method: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão Crédito">Cartão Crédito</option>
                <option value="Cartão Débito">Cartão Débito</option>
                <option value="Transferência">Transferência</option>
                <option value="Cheque">Cheque</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>
            <div className="md:col-span-3 flex gap-4">
              <button type="submit" className="premium-button flex-1">
                💾 {editingTransaction ? 'Atualizar' : 'Salvar'} Dízimo
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setNewTransaction({ type: 'dizimo', member: '', memberId: '', categoryId: '', amount: '', method: 'PIX' });
                }}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={`main-chart-container transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Lista de Dízimos
            </h3>
            <p className="chart-subtitle">Gestão completa de todos os dízimos registrados</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-4 font-bold text-black">Membro</th>
                <th className="text-left p-4 font-bold text-black">Valor</th>
                <th className="text-left p-4 font-bold text-black">Data</th>
                <th className="text-left p-4 font-bold text-black">Método</th>
                <th className="text-left p-4 font-bold text-black">Status</th>
                <th className="text-left p-4 font-bold text-black">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dizimos.map((dizimo: any) => (
                <tr key={dizimo.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold">
                        {dizimo.member.charAt(0)}
                      </div>
                      <span className="font-semibold text-black">{dizimo.member}</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-black">R$ {dizimo.amount.toFixed(2)}</td>
                  <td className="p-4 text-gray-600">{new Date(dizimo.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-gray-600">{dizimo.method}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(dizimo.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        dizimo.status === 'confirmado'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      {dizimo.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => editTransaction(dizimo)} className="w-8 h-8 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center" title="Editar">✏️</button>
                      <button onClick={() => deleteTransaction(dizimo.id)} className="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center" title="Excluir">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {dizimos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">Nenhum dízimo registrado</h3>
            <p className="text-gray-500">Comece adicionando o primeiro dízimo!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Ofertas - Sistema CRUD Completo
function OfertasContent({ 
  transactions, 
  showForm, 
  setShowForm,
  editingTransaction,
  newTransaction,
  setNewTransaction,
  addTransaction,
  editTransaction,
  deleteTransaction,
  toggleStatus,
  isLoaded,
  membersOptions,
  categoriesOptions,
  loadOptions
}: any) {
  const ofertas = transactions;
  const totalOfertas = ofertas.filter((o: any) => o.status === 'confirmado').reduce((sum: number, o: any) => sum + o.amount, 0);
  const ofertasPendentes = ofertas.filter((o: any) => o.status === 'pendente').length;
  
  return (
    <div className="space-y-8">
      <div className={`fade-in-up transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-black flex items-center gap-3">
            <span className="text-4xl">🎁</span>
            Gestão de Ofertas
          </h2>
          <button 
            onClick={() => {
              loadOptions(); // Carregar membros e categorias ao abrir formulário
              setNewTransaction({ type: 'oferta', member: '', memberId: '', categoryId: '', amount: '', method: 'PIX' });
              setShowForm(true);
            }}
            className="premium-button"
          >
            ➕ Nova Oferta
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="beautiful-card">
            <div className="stat-icon-container">💰</div>
            <h3 className="stat-title">Total Arrecadado</h3>
            <div className="stat-value">R$ {totalOfertas.toFixed(2)}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">📊</div>
            <h3 className="stat-title">Total de Registros</h3>
            <div className="stat-value">{ofertas.length}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">⏳</div>
            <h3 className="stat-title">Pendentes</h3>
            <div className="stat-value">{ofertasPendentes}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="sidebar-card fade-in-up">
          <h3 className="sidebar-title">
            <span className="sidebar-icon">✨</span>
            {editingTransaction ? 'Editar Oferta' : 'Nova Oferta'}
          </h3>
          <form onSubmit={addTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Membro</label>
              <select
                value={newTransaction.memberId}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = (membersOptions || []).find((m: any) => m.id === id)?.name || '';
                  setNewTransaction({ ...newTransaction, memberId: id, member: name });
                }}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              >
                <option value="">Selecione um membro</option>
                {membersOptions?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Categoria</label>
              <select
                value={newTransaction.categoryId}
                onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categoriesOptions?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Método</label>
              <select
                value={newTransaction.method}
                onChange={(e) => setNewTransaction({...newTransaction, method: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão Crédito">Cartão Crédito</option>
                <option value="Cartão Débito">Cartão Débito</option>
                <option value="Transferência">Transferência</option>
                <option value="Cheque">Cheque</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>
            <div className="md:col-span-3 flex gap-4">
              <button type="submit" className="premium-button flex-1">
                💾 {editingTransaction ? 'Atualizar' : 'Salvar'} Oferta
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setNewTransaction({ type: 'oferta', member: '', memberId: '', categoryId: '', amount: '', method: 'PIX' });
                }}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={`main-chart-container transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Lista de Ofertas
            </h3>
            <p className="chart-subtitle">Gestão completa de todas as ofertas registradas</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-4 font-bold text-black">Membro</th>
                <th className="text-left p-4 font-bold text-black">Valor</th>
                <th className="text-left p-4 font-bold text-black">Data</th>
                <th className="text-left p-4 font-bold text-black">Método</th>
                <th className="text-left p-4 font-bold text-black">Status</th>
                <th className="text-left p-4 font-bold text-black">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ofertas.map((oferta: any) => (
                <tr key={oferta.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold">
                        {oferta.member.charAt(0)}
                      </div>
                      <span className="font-semibold text-black">{oferta.member}</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-black">R$ {oferta.amount.toFixed(2)}</td>
                  <td className="p-4 text-gray-600">{new Date(oferta.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-gray-600">{oferta.method}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(oferta.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        oferta.status === 'confirmado'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      {oferta.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => editTransaction(oferta)} className="w-8 h-8 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center" title="Editar">✏️</button>
                      <button onClick={() => deleteTransaction(oferta.id)} className="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center" title="Excluir">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {ofertas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">Nenhuma oferta registrada</h3>
            <p className="text-gray-500">Comece adicionando a primeira oferta!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Membros - Sistema CRUD Completo
function MembrosContent({ isLoaded }: any) {
  const [membros, setMembros] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '', birthDate: '', status: 'ativo' });

  const loadMembers = async () => {
    try {
      const res = await api.get('/members', { params: { page: 1, limit: 100 } });
      const items = res.data?.members ?? res.data ?? [];
      const mapped = items.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email ?? '',
        phone: m.phone ?? '',
        birthDate: m.birthDate ? new Date(m.birthDate).toISOString().split('T')[0] : '',
        status: m.active ? 'ativo' : 'inativo',
        joined: m.memberSince || m.createdAt,
      }));
      setMembros(mapped);
    } catch (err) {
      console.error('Erro ao carregar membros', err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      loadMembers();
    }
  }, []);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newMember.name.trim(),
        email: newMember.email?.trim() || undefined,
        phone: newMember.phone?.trim() || undefined,
        birthDate: newMember.birthDate || undefined,
      } as any;

      if (editingMember) {
        await api.put(`/members/${editingMember.id}`, payload);
        const willBeActive = newMember.status === 'ativo';
        const prevActive = editingMember.status === 'ativo';
        if (willBeActive !== prevActive) {
          await api.patch(`/members/${editingMember.id}/active`, { active: willBeActive });
        }
        setEditingMember(null);
      } else {
        await api.post('/members', payload);
      }
      await loadMembers();
      setNewMember({ name: '', email: '', phone: '', birthDate: '', status: 'ativo' });
      setShowForm(false);
    } catch (err) {
      console.error('Erro ao salvar membro', err);
      alert('Falha ao salvar membro. Verifique os dados (email válido e nome com mínimo de 3 caracteres).');
    }
  };

  const editMember = (member: any) => {
    setEditingMember(member);
    setNewMember({ name: member.name, email: member.email, phone: member.phone, birthDate: member.birthDate || '', status: member.status });
    setShowForm(true);
  };

  const deleteMember = async (id: string) => {
    try {
      if (typeof window !== 'undefined') {
        const ok = window.confirm('Deseja realmente remover este membro?');
        if (!ok) return;
      }
      await api.delete(`/members/${id}`);
      // Como o backend faz soft delete (active=false), removemos da lista imediatamente
      setMembros((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar membro', err);
      const msg = err?.response?.data?.error || 'Erro ao deletar membro';
      alert(msg === 'Sem permissão para deletar membros' ? 'Sem permissão para deletar. Apenas ADMIN pode remover membros.' : msg);
    }
  };

  const toggleMemberStatus = async (id: string) => {
    try {
      const current = membros.find((m) => m.id === id);
      const nextActive = !(current?.status === 'ativo');
      await api.patch(`/members/${id}/active`, { active: nextActive });
      setMembros(membros.map((m) => m.id === id ? { ...m, status: nextActive ? 'ativo' : 'inativo' } : m));
    } catch (err) {
      console.error('Erro ao alterar status do membro', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className={`fade-in-up transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-black flex items-center gap-3">
            <span className="text-4xl">👥</span>
            Gestão de Membros
          </h2>
          <button onClick={() => { setNewMember({ name: '', email: '', phone: '', birthDate: '', status: 'ativo' }); setShowForm(true); }} className="premium-button">
            ➕ Novo Membro
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="beautiful-card">
            <div className="stat-icon-container">👤</div>
            <h3 className="stat-title">Total de Membros</h3>
            <div className="stat-value">{membros.length}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">✅</div>
            <h3 className="stat-title">Membros Ativos</h3>
            <div className="stat-value">{membros.filter(m => m.status === 'ativo').length}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">⏸️</div>
            <h3 className="stat-title">Membros Inativos</h3>
            <div className="stat-value">{membros.filter(m => m.status === 'inativo').length}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="sidebar-card fade-in-up">
          <h3 className="sidebar-title">
            <span className="sidebar-icon">✨</span>
            {editingMember ? 'Editar Membro' : 'Novo Membro'}
          </h3>
          <form onSubmit={addMember} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Nome Completo</label>
              <input type="text" placeholder="Digite o nome completo" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Email</label>
              <input type="email" placeholder="email@exemplo.com" value={newMember.email} onChange={(e) => setNewMember({...newMember, email: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">WhatsApp</label>
              <input type="tel" placeholder="WhatsApp (apenas números)" value={newMember.phone} onChange={(e) => setNewMember({...newMember, phone: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Data de Nascimento</label>
              <input type="date" value={newMember.birthDate} onChange={(e) => setNewMember({...newMember, birthDate: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Status</label>
              <select value={newMember.status} onChange={(e) => setNewMember({...newMember, status: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button type="submit" className="premium-button flex-1">
                💾 {editingMember ? 'Atualizar' : 'Salvar'} Membro
              </button>
              <button type="button" onClick={() => { setShowForm(false); setNewMember({ name: '', email: '', phone: '', birthDate: '', status: 'ativo' }); }} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors">
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={`main-chart-container transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Lista de Membros
            </h3>
            <p className="chart-subtitle">Gestão completa de todos os membros cadastrados</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-4 font-bold text-black">Nome</th>
                <th className="text-left p-4 font-bold text-black">Email</th>
                <th className="text-left p-4 font-bold text-black">WhatsApp</th>
                <th className="text-left p-4 font-bold text-black">Status</th>
                <th className="text-left p-4 font-bold text-black">Data de Cadastro</th>
                <th className="text-left p-4 font-bold text-black">Ações</th>
              </tr>
            </thead>
            <tbody>
              {membros.filter(m => m.status === 'ativo').map((membro: any) => (
                <tr key={membro.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold">
                        {membro.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-black">{membro.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{membro.email}</td>
                  <td className="p-4 text-gray-600">
                    {membro.phone ? (
                      (() => {
                        const digits = String(membro.phone).replace(/\D/g, '');
                        const href = `https://wa.me/${digits}`;
                        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{membro.phone}</a>;
                      })()
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleMemberStatus(membro.id)} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${membro.status === 'ativo' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}>
                      {membro.status === 'ativo' ? '✅ Ativo' : '❌ Inativo'}
                    </button>
                  </td>
                  <td className="p-4 text-gray-600">{new Date(membro.joined).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => editMember(membro)} className="w-8 h-8 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center" title="Editar">✏️</button>
                      <button onClick={() => deleteMember(membro.id)} className="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center" title="Excluir">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente Relatórios - Sistema de Relatórios Completo
function RelatoriosContent({ transactions, isLoaded }: any) {
  const [filterType, setFilterType] = useState('todos');
  const [filterPeriod, setFilterPeriod] = useState('mes');
  
  const filteredTransactions = transactions.filter((t: any) => {
    if (filterType !== 'todos' && t.type !== filterType) return false;
    
    const transactionDate = new Date(t.date);
    const now = new Date();
    
    switch (filterPeriod) {
      case 'hoje':
        return transactionDate.toDateString() === now.toDateString();
      case 'semana':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactionDate >= weekAgo;
      case 'mes':
        return transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear();
      case 'ano':
        return transactionDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  });
  
  const totalArrecadado = filteredTransactions.filter((t: any) => t.status === 'confirmado').reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalDizimos = filteredTransactions.filter((t: any) => t.type === 'dizimo' && t.status === 'confirmado').reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalOfertas = filteredTransactions.filter((t: any) => t.type === 'oferta' && t.status === 'confirmado').reduce((sum: number, t: any) => sum + t.amount, 0);
  
  return (
    <div className="space-y-8">
      <div className={`fade-in-up transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-black flex items-center gap-3">
            <span className="text-4xl">📈</span>
            Relatórios Financeiros
          </h2>
          <button onClick={() => window.print()} className="premium-button">
            🖨️ Imprimir Relatório
          </button>
        </div>
        
        <div className="sidebar-card">
          <h3 className="sidebar-title">
            <span className="sidebar-icon">🔍</span>
            Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Tipo de Transação</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none">
                <option value="todos">Todos</option>
                <option value="dizimo">Dízimos</option>
                <option value="oferta">Ofertas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Período</label>
              <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none">
                <option value="hoje">Hoje</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mês</option>
                <option value="ano">Este Ano</option>
                <option value="todos">Todos os Períodos</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="beautiful-card">
            <div className="stat-icon-container">💰</div>
            <h3 className="stat-title">Total Arrecadado</h3>
            <div className="stat-value">R$ {totalArrecadado.toFixed(2)}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">💎</div>
            <h3 className="stat-title">Dízimos</h3>
            <div className="stat-value">R$ {totalDizimos.toFixed(2)}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
          <div className="beautiful-card">
            <div className="stat-icon-container">🎁</div>
            <h3 className="stat-title">Ofertas</h3>
            <div className="stat-value">R$ {totalOfertas.toFixed(2)}</div>
            <div className="stat-progress"><div className="stat-progress-fill"></div></div>
          </div>
        </div>
      </div>

      <div className={`main-chart-container transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Relatório Detalhado
            </h3>
            <p className="chart-subtitle">Exibindo {filteredTransactions.length} transações encontradas</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-4 font-bold text-black">Data</th>
                <th className="text-left p-4 font-bold text-black">Membro</th>
                <th className="text-left p-4 font-bold text-black">Tipo</th>
                <th className="text-left p-4 font-bold text-black">Valor</th>
                <th className="text-left p-4 font-bold text-black">Método</th>
                <th className="text-left p-4 font-bold text-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction: any) => (
                <tr key={transaction.id} className="border-b border-gray-100">
                  <td className="p-4 text-gray-600">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 font-semibold text-black">{transaction.member}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${transaction.type === 'dizimo' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {transaction.type === 'dizimo' ? '💎 Dízimo' : '🎁 Oferta'}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-black">R$ {transaction.amount.toFixed(2)}</td>
                  <td className="p-4 text-gray-600">{transaction.method}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${transaction.status === 'confirmado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {transaction.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">Nenhuma transação encontrada</h3>
            <p className="text-gray-500">Tente ajustar os filtros para encontrar as transações desejadas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Configurações - Sistema de Configurações Completo
function ConfiguracoesContent({ isLoaded }: any) {
  const [config, setConfig] = useState({
    churchName: '',
    adminEmail: '',
    currency: 'BRL',
    notifications: true,
    autoBackup: false,
    reportPeriod: 'monthly',
    monthlyGoal: 0,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('config');
        if (raw) {
          const cfg = JSON.parse(raw);
          setConfig((prev) => ({ ...prev, ...cfg }));
        }
      } catch {}
    }
  }, []);

  const saveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('config', JSON.stringify(config));
      }
    } catch {}
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  
  return (
    <div className="space-y-8">
      <div className={`fade-in-up transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-black flex items-center gap-3">
            <span className="text-4xl">⚙️</span>
            Configurações do Sistema
          </h2>
          {showSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              ✅ Configurações salvas com sucesso!
            </div>
          )}
        </div>
        
        <div className="sidebar-card">
          <h3 className="sidebar-title">
            <span className="sidebar-icon">🏢</span>
            Informações da Igreja
          </h3>
          <form onSubmit={saveConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Nome da Igreja</label>
                <input type="text" value={config.churchName} onChange={(e) => setConfig({...config, churchName: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Email do Administrador</label>
                <input type="email" value={config.adminEmail} onChange={(e) => setConfig({...config, adminEmail: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none" required />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-black">Preferências</h4>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-semibold text-black">Notificações por Email</span>
                  <p className="text-sm text-gray-600">Receber notificações sobre novas transações</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={config.notifications} onChange={(e) => setConfig({...config, notifications: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <button type="submit" className="premium-button w-full">
              💾 Salvar Configurações
            </button>
          </form>
        </div>
        
        {/* Sem ações simuladas: cards de backup/restauração removidos */}
      </div>
    </div>
  );
}

// Componente Dashboard - Design moderno e bonito
function DashboardContent({ 
  stats, 
  isLoaded, 
  transactions, 
  showTransactionForm, 
  setShowTransactionForm,
  editingTransaction,
  setEditingTransaction,
  newTransaction,
  setNewTransaction,
  addTransaction,
  editTransaction,
  deleteTransaction,
  toggleStatus,
  membersOptions,
  categoriesOptions,
  recentActivities,
  overview,
  typeDistribution,
  monthlyEvolution,
  paymentMethodDistribution
}: DashboardProps) {
  return (
    <div className="space-y-10">
      
      {/* Seção de Cards Estatísticos */}
      <div className={`fade-in-up transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-black flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Painel Executivo
          </h2>
          <button 
            onClick={() => setShowTransactionForm(true)}
            className="premium-button"
          >
            ➕ Nova Transação
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {stats.map((stat: Stat, index: number) => (
            <div
              key={stat.title}
              className="beautiful-card"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="stat-icon-container">
                  {stat.icon}
                </div>
                <div className="stat-change">
                  {stat.change}
                </div>
              </div>
              
              <h3 className="stat-title">
                {stat.title}
              </h3>
              <div className="stat-value">
                {stat.value}
              </div>
              <div className="stat-progress">
                <div className="stat-progress-fill"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário de Nova Transação */}
      {showTransactionForm && (
        <div className="sidebar-card fade-in-up">
          <h3 className="sidebar-title">
            <span className="sidebar-icon">✨</span>
            {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
          </h3>
          <form onSubmit={addTransaction} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Tipo</label>
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
              >
                <option value="dizimo">Dízimo</option>
                <option value="oferta">Oferta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Membro</label>
              <select
                value={newTransaction.memberId}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = (membersOptions || []).find((m: any) => m.id === id)?.name || '';
                  setNewTransaction({ ...newTransaction, memberId: id, member: name });
                }}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              >
                <option value="">Selecione um membro</option>
                {membersOptions?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Categoria</label>
              <select
                value={newTransaction.categoryId}
                onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categoriesOptions?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Método</label>
              <select
                value={newTransaction.method}
                onChange={(e) => setNewTransaction({...newTransaction, method: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none"
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão Crédito">Cartão Crédito</option>
                <option value="Cartão Débito">Cartão Débito</option>
                <option value="Transferência">Transferência</option>
                <option value="Cheque">Cheque</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>
            <div className="md:col-span-4 flex gap-4">
              <button type="submit" className="premium-button flex-1">
                💾 {editingTransaction ? 'Atualizar' : 'Salvar'} Transação
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowTransactionForm(false);
                  setEditingTransaction(null);
                  setNewTransaction({ type: 'dizimo', member: '', memberId: '', categoryId: '', amount: '', method: 'PIX' });
                }}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Área Principal do Dashboard */}
      <div className={`grid grid-cols-1 xl:grid-cols-3 gap-10 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Lista de Transações */}
        <div className="xl:col-span-2">
          <div className="main-chart-container">
            <div className="chart-header">
              <div>
                <h3 className="chart-title flex items-center gap-3">
                  <span className="text-3xl">💰</span>
                  Transações Recentes
                </h3>
                <p className="chart-subtitle">Gestão completa de dízimos e ofertas</p>
              </div>
            </div>
            
            {/* Tabela de Transações */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-4 font-bold text-black">Membro</th>
                    <th className="text-left p-4 font-bold text-black">Tipo</th>
                    <th className="text-left p-4 font-bold text-black">Valor</th>
                    <th className="text-left p-4 font-bold text-black">Método</th>
                    <th className="text-left p-4 font-bold text-black">Status</th>
                    <th className="text-left p-4 font-bold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 8).map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold">
                            {transaction.member.charAt(0)}
                          </div>
                          <span className="font-semibold text-black">{transaction.member}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          transaction.type === 'dizimo' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.type === 'dizimo' ? '💎 Dízimo' : '🎁 Oferta'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-black">
                        R$ {transaction.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-gray-600">
                        {transaction.method}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleStatus(transaction.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            transaction.status === 'confirmado'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {transaction.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => editTransaction(transaction)}
                            className="w-8 h-8 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                            className="w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Resumo Rápido */}
            <div className="summary-grid mt-8">
              <div className="summary-card">
                <div className="summary-value today">R$ {transactions.filter(t => t.date === new Date().toISOString().split('T')[0] && t.status === 'confirmado').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</div>
                <div className="summary-label">Hoje</div>
              </div>
              <div className="summary-card">
                <div className="summary-value week">R$ {transactions.filter(t => t.status === 'confirmado').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</div>
                <div className="summary-label">Total Confirmado</div>
              </div>
              <div className="summary-card">
                <div className="summary-value month">{transactions.filter(t => t.status === 'pendente').length}</div>
                <div className="summary-label">Pendentes</div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Evolução Mensal (barras) */}
              <div className="beautiful-card">
                <h3 className="chart-title mb-4">📅 Evolução Mensal (últimos meses)</h3>
                <div className="space-y-2">
                  {([...monthlyEvolution]
                    .sort((a: any, b: any) => new Date(a.month).getTime() - new Date(b.month).getTime())
                    .slice(-12)
                    .map((item: any) => ({
                      label: new Date(item.month).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
                      total: Number(item.total || 0)
                    })) as any[]).reduce((acc: any, it: any) => {
                      acc.max = Math.max(acc.max, it.total);
                      acc.items.push(it);
                      return acc;
                    }, { max: 1, items: [] as any[] })
                    .items
                    .map((it: any, idx: number, arr: any[]) => {
                      const max = arr.reduce((m: number, x: any) => Math.max(m, x.total), 1);
                      const pct = Math.round((it.total / (max || 1)) * 100);
                      return (
                        <div key={`${it.label}-${idx}`} className="flex items-center gap-3">
                          <div className="w-20 text-xs text-gray-600">{it.label}</div>
                          <div className="flex-1 bg-gray-100 h-3 rounded">
                            <div className="bg-black h-3 rounded" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-24 text-right text-xs font-semibold">R$ {it.total.toFixed(2)}</div>
                        </div>
                      )
                    })
                  }
                </div>
              </div>

              {/* Distribuição por Método (mês atual) */}
              <div className="beautiful-card">
                <h3 className="chart-title mb-4">💳 Distribuição por Método (mês)</h3>
                <div className="space-y-2">
                  {(() => {
                    const mapLabel: any = {
                      PIX: 'PIX',
                      DINHEIRO: 'Dinheiro',
                      CARTAO_CREDITO: 'Cartão Crédito',
                      CARTAO_DEBITO: 'Cartão Débito',
                      TRANSFERENCIA: 'Transferência',
                      CHEQUE: 'Cheque',
                      BOLETO: 'Boleto',
                    };
                    const items = paymentMethodDistribution.map((pm: any) => ({
                      label: mapLabel[pm.paymentMethod] || pm.paymentMethod,
                      total: Number(pm._sum?.amount || 0)
                    }));
                    const max = items.reduce((m: number, x: any) => Math.max(m, x.total), 1);
                    return items.map((it: any, idx: number) => {
                      const pct = Math.round((it.total / (max || 1)) * 100);
                      return (
                        <div key={`${it.label}-${idx}`} className="flex items-center gap-3">
                          <div className="w-28 text-xs text-gray-600">{it.label}</div>
                          <div className="flex-1 bg-gray-100 h-3 rounded">
                            <div className="bg-black h-3 rounded" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-24 text-right text-xs font-semibold">R$ {it.total.toFixed(2)}</div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar Direita */}
        <div className="space-y-8">

          {/* Atividades Recentes */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">⚡</span>
              Atividades Recentes
            </h3>
            <div className="space-y-3">
              {(recentActivities && recentActivities.length > 0) ? (
                recentActivities.map((activity: any, index: number) => (
                  <div key={index} className="activity-item">
                    <div className={`activity-dot ${activity.type}`}></div>
                    <div className="activity-content">
                      <div className="activity-text">
                        <span className="text-gray-700">{activity.user}</span> • {activity.action}
                      </div>
                      <div className="activity-time">{activity.time}</div>
                    </div>
                    <div className="activity-amount">{activity.amount}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">Sem atividades recentes.</div>
              )}
            </div>
            <button className="w-full mt-6 py-3 text-center text-gray-600 hover:text-black transition-colors text-sm font-semibold border-t border-gray-200 pt-4">
              Ver todas as atividades →
            </button>
          </div>

          {/* Status do Sistema removido (dados simulados) */}
        </div>
      </div>
    </div>
  );
}
