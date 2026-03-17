import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase/client';
import { Plus, Edit2, Trash2, Globe, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Platform {
  id: string;
  name: string;
  logo_url: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const Platforms = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    status: 'active' as const
  });

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setPlatforms(data || []);
    } catch (error: any) {
      toast.error('Error fetching platforms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlatform) {
        const { error } = await supabase
          .from('platforms')
          .update(formData)
          .eq('id', editingPlatform.id);
        if (error) throw error;
        toast.success('Platform updated');
      } else {
        const { error } = await supabase
          .from('platforms')
          .insert([formData]);
        if (error) throw error;
        toast.success('Platform added');
      }
      setIsModalOpen(false);
      setEditingPlatform(null);
      setFormData({ name: '', logo_url: '', status: 'active' });
      fetchPlatforms();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const { error } = await supabase
        .from('platforms')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Platform deleted');
      fetchPlatforms();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredPlatforms = platforms.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Platforms Management</h1>
        <button
          onClick={() => {
            setEditingPlatform(null);
            setFormData({ name: '', logo_url: '', status: 'active' });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus size={20} /> Add Platform
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search platforms..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlatforms.map((platform) => (
            <div key={platform.id} className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {platform.logo_url ? (
                    <img src={platform.logo_url} alt={platform.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Globe className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{platform.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      platform.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {platform.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPlatform(platform);
                      setFormData({
                        name: platform.name,
                        logo_url: platform.logo_url,
                        status: platform.status
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(platform.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPlatform ? 'Edit Platform' : 'Add New Platform'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-lg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Logo URL</label>
                <input
                  type="url"
                  className="w-full p-2 border rounded-lg"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingPlatform ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Platforms;