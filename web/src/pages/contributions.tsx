import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  Cross,
  Settings,
  LogOut,
  DollarSign,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import api from '@/lib/api';

interface Contribution {
  id: string;
  memberName: string;
  type: string;
  amount: number;
  date: string;
  paymentMethod: string;
  verified: boolean;
}

export default function Contributions() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/contributions', { params: { limit: 100 } });
        const items = (res.data?.contributions ?? res.data ?? []) as any[];
        const mapped: Contribution[] = items.map((c: any) => ({
          id: c.id,
          memberName: c.member?.name ?? '—',
          type: c.type,
          amount: Number(c.amount) || 0,
          date: c.date,
          paymentMethod: c.paymentMethod,
          verified: !!c.verified,
        }));
        setContributions(mapped);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DIZIMO': return 'Dízimo';
      case 'OFERTA': return 'Oferta';
      case 'OFERTA_MISSIONARIA': return 'Oferta Missionária';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DIZIMO': return 'bg-blue-100 text-blue-800';
      case 'OFERTA': return 'bg-green-100 text-green-800';
      case 'OFERTA_MISSIONARIA': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredContributions = contributions.filter(contribution => {
    const matchesSearch = contribution.memberName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === '' || contribution.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Contribuições - Sistema de Dízimos | Assembleia de Deus Vila Maria</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Cross className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Assembleia de Deus</h1>
                    <p className="text-sm text-gray-500">Vila Maria</p>
                  </div>
                </div>
              </div>
              
              <nav className="hidden md:flex space-x-8">
                <a href="/" className="text-gray-500 hover:text-gray-900">Dashboard</a>
                <a href="#" className="text-blue-600 font-medium">Contribuições</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">Membros</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">Relatórios</a>
              </nav>

              <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-500 hover:text-gray-900">
                  <Settings className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-900">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Contribuições</h2>
                <p className="text-gray-600">Gerencie dízimos, ofertas e contribuições</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Nova Contribuição</span>
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total do Mês</p>
                  <p className="text-2xl font-bold text-gray-900">R$ 2.450,00</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                  <p className="text-2xl font-bold text-gray-900">R$ 500,00</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <User className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Contribuintes</p>
                  <p className="text-2xl font-bold text-gray-900">34</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">1</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por membro..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Todos os tipos</option>
                  <option value="DIZIMO">Dízimo</option>
                  <option value="OFERTA">Oferta</option>
                  <option value="OFERTA_MISSIONARIA">Oferta Missionária</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter className="h-5 w-5" />
                  <span>Filtros</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Download className="h-5 w-5" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Contributions Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pagamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContributions.map((contribution) => (
                    <tr key={contribution.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {contribution.memberName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(contribution.type)}`}>
                          {getTypeLabel(contribution.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(contribution.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contribution.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contribution.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          contribution.verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {contribution.verified ? 'Verificado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Editar
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredContributions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhuma contribuição encontrada.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}