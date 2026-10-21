import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
	const token = localStorage.getItem('access_token');
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
	res => res,
	async err => {
		const originalRequest = err.config;
		if (err.response?.status === 401 && !originalRequest?._retry) {
			originalRequest._retry = true;
			const refresh = localStorage.getItem('refresh_token');
			if (refresh) {
				try {
					const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh });
					localStorage.setItem('access_token', data.access);
					originalRequest.headers.Authorization = `Bearer ${data.access}`;
					return api(originalRequest);
				} catch (refreshError) {
					localStorage.removeItem('access_token');
					localStorage.removeItem('refresh_token');
					window.location.href = '/login';
					return Promise.reject(refreshError);
				}
			}
			window.location.href = '/login';
		}
		return Promise.reject(err);
	}
);

  export const entities = {
      Teacher: {
          list:   (ordering = '-created_at') => api.get(`/teachers/?ordering=${ordering}`).then(r => r.data.results || r.data),
          create: (data)     => api.post('/teachers/', data).then(r => r.data),
          update: (id, data) => api.patch(`/teachers/${id}/`, data).then(r => r.data),
          delete: (id)       => api.delete(`/teachers/${id}/`),
      },
      ClassAssignment: {
          list:   ()         => api.get('/class-assignments/').then(r => r.data.results || r.data),
          filter: (params)   => api.get('/class-assignments/', { params }).then(r => r.data.results || r.data),
          create: (data)     => api.post('/class-assignments/', data).then(r => r.data),
          delete: (id)       => api.delete(`/class-assignments/${id}/`),
      },
      Student: {
          list:       (ordering = '-created_at') => api.get(`/students/?ordering=${ordering}`).then(r => r.data.results || r.data),
          get:        (id)        => api.get(`/students/${id}/`).then(r => r.data),
          create:     (data)      => api.post('/students/', data).then(r => r.data),
          update:     (id, data)  => api.patch(`/students/${id}/`, data).then(r => r.data),
          delete:     (id)        => api.delete(`/students/${id}/`),
          filter:     (params)    => api.get('/students/', { params }).then(r => r.data.results || r.data),
      },
      Attendance: {
          list:       ()          => api.get('/attendance/').then(r => r.data.results || r.data),
          bulkCreate: (records)   => Promise.all(records.map(r => api.post('/attendance/', r).then(x => x.data))),
          filter:     (params)    => api.get('/attendance/', { params }).then(r => r.data.results || r.data),
      },
      ExamResult: {
          list:   (ordering = '-created_at') => api.get(`/results/?ordering=${ordering}`).then(r => r.data.results || r.data),
          create: (data)     => api.post('/results/', data).then(r => r.data),
          update: (id, data) => api.patch(`/results/${id}/`, data).then(r => r.data),
          delete: (id)       => api.delete(`/results/${id}/`),
          filter: (params)   => api.get('/results/', { params }).then(r => r.data.results || r.data),
      },
      ParentMessage: {
          list:   (ordering = '-created_at') => api.get(`/communications/?ordering=${ordering}`).then(r => r.data.results || r.data),
          create: (data)     => api.post('/communications/', data).then(r => r.data),
          filter: (params)   => api.get('/communications/', { params }).then(r => r.data.results || r.data),
          send:   (id)       => api.post(`/communications/${id}/send/`).then(r => r.data),
      },
      TimetableSlot: {
          list:   () => api.get('/timetable/').then(r => r.data.results || r.data),
          create: (data)     => api.post('/timetable/', data).then(r => r.data),
          update: (id, data) => api.patch(`/timetable/${id}/`, data).then(r => r.data),
          delete: (id)       => api.delete(`/timetable/${id}/`),
      },
  };

  export const auth = {
      login: async (username, password) => {
          const { data } = await api.post('/auth/login/', { username, password });
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          return data;
      },
      logout: () => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
      },
      me: async () => {
          const { data } = await api.get('/auth/me/');
          return data;  // Must include { id, email, full_name, role }
                        // role must be: 'admin' | 'management' | 'teacher'
      },
      isAuthenticated: () => !!localStorage.getItem('access_token'),
  };

export default api;
