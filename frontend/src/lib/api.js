import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const api = {
  list: (r) => client.get(`/${r}`).then((x) => x.data),
  get: (r, id) => client.get(`/${r}/${id}`).then((x) => x.data),
  create: (r, data) => client.post(`/${r}`, data).then((x) => x.data),
  update: (r, id, data) => client.put(`/${r}/${id}`, data).then((x) => x.data),
  remove: (r, id) => client.delete(`/${r}/${id}`).then((x) => x.data),
  singleton: (r) => client.get(`/${r}`).then((x) => x.data),
  updateSingleton: (r, data) => client.put(`/${r}`, data).then((x) => x.data),
  stats: () => client.get(`/stats/dashboard`).then((x) => x.data),
  seed: () => client.post(`/seed`).then((x) => x.data),
};

export default api;
