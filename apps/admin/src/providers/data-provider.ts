import type { DataProvider } from "@refinedev/core";
import axiosInstance from "../utils/axios";
import { API_URL } from "../config/constants";

// Normalize the various backend response shapes into { data, total }
function normalizeList(responseData: any): { data: any[]; total: number } {
  // Pattern C: { items: [...], totalCount }
  if (Array.isArray(responseData.items)) {
    return {
      data: responseData.items,
      total: responseData.totalCount ?? responseData.items.length,
    };
  }

  // Pattern A: { data: [...], pagination: { total } }
  if (Array.isArray(responseData.data) && responseData.pagination) {
    return {
      data: responseData.data,
      total: responseData.pagination.total ?? responseData.data.length,
    };
  }

  // Pattern B: { data: [...], meta: { total } }
  if (Array.isArray(responseData.data) && responseData.meta) {
    return {
      data: responseData.data,
      total: responseData.meta.total ?? responseData.data.length,
    };
  }

  // Pattern D: { data: [...] } without pagination
  if (Array.isArray(responseData.data)) {
    return { data: responseData.data, total: responseData.data.length };
  }

  // Direct array
  if (Array.isArray(responseData)) {
    return { data: responseData, total: responseData.length };
  }

  // Pattern E/F: { someKey: [...], total, page, limit } (newsletters, notes, etc.)
  const arrayKey = Object.keys(responseData).find(k => Array.isArray(responseData[k]));
  if (arrayKey) {
    return {
      data: responseData[arrayKey],
      total: responseData.total ?? responseData.totalCount ?? responseData[arrayKey].length,
    };
  }

  // Single object (wrapped in array for consistency)
  return { data: [responseData], total: 1 };
}

// Normalize single-item responses
function normalizeOne(responseData: any): any {
  if (responseData.success && responseData.data) return responseData.data;
  if (responseData.data && !Array.isArray(responseData.data)) return responseData.data;
  if (responseData.user) return responseData.user;
  if (responseData.category) return responseData.category;
  if (responseData.role) return responseData.role;
  if (responseData.config) return responseData.config;
  if (responseData.policy) return responseData.policy;
  if (responseData.record) return responseData.record;
  return responseData;
}

// Map Refine resource names to API paths
function getApiPath(resource: string, meta?: Record<string, any>): string {
  if (meta?.apiPath) return meta.apiPath;

  // Fallback mapping
  const pathMap: Record<string, string> = {
    users: "/api/admin/users",
    moderation: "/api/admin/listings/pending",
    categories: "/api/admin/categories",
    roles: "/api/admin/roles",
    "tenant-config": "/api/admin/config",
    "system-settings": "/api/admin/system/settings",
    announcements: "/api/admin/system/announcements",
    audit: "/api/admin/audit",
    analytics: "/api/admin/analytics",
    registration: "/api/registration/admin",
  };
  return pathMap[resource] || `/api/admin/${resource}`;
}

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const apiPath = getApiPath(resource, meta);
    const params: Record<string, any> = {};

    // Map Refine pagination to backend params
    if (pagination) {
      params.page = pagination.current ?? 1;
      params.limit = pagination.pageSize ?? 20;
    }

    // Map filters
    if (filters) {
      for (const filter of filters) {
        if ("field" in filter && filter.value !== undefined && filter.value !== "") {
          params[filter.field] = filter.value;
        }
      }
    }

    // Map sorters
    if (sorters && sorters.length > 0) {
      params.sort = sorters[0].field;
      params.order = sorters[0].order;
    }

    const { data: responseData } = await axiosInstance.get(apiPath, { params });
    const { data, total } = normalizeList(responseData);

    return { data, total };
  },

  getOne: async ({ resource, id, meta }) => {
    const apiPath = getApiPath(resource, meta);
    const { data: responseData } = await axiosInstance.get(`${apiPath}/${id}`);
    return { data: normalizeOne(responseData) };
  },

  create: async ({ resource, variables, meta }) => {
    const apiPath = getApiPath(resource, meta);
    const { data: responseData } = await axiosInstance.post(apiPath, variables);
    return { data: normalizeOne(responseData) };
  },

  update: async ({ resource, id, variables, meta }) => {
    const apiPath = getApiPath(resource, meta);
    const { data: responseData } = await axiosInstance.put(`${apiPath}/${id}`, variables);
    return { data: normalizeOne(responseData) };
  },

  deleteOne: async ({ resource, id, meta }) => {
    const apiPath = getApiPath(resource, meta);
    const { data: responseData } = await axiosInstance.delete(`${apiPath}/${id}`);
    return { data: responseData };
  },

  custom: async ({ url, method, payload, query }) => {
    let response;
    const config = { params: query };
    switch (method) {
      case "get":
        response = await axiosInstance.get(url, config);
        break;
      case "post":
        response = await axiosInstance.post(url, payload, config);
        break;
      case "put":
        response = await axiosInstance.put(url, payload, config);
        break;
      case "delete":
        response = await axiosInstance.delete(url, config);
        break;
      default:
        response = await axiosInstance.get(url, config);
    }
    return { data: response.data };
  },

  getMany: async ({ resource, ids, meta }) => {
    // Backend doesn't support bulk get, fetch individually
    const apiPath = getApiPath(resource, meta);
    const results = await Promise.all(
      ids.map((id) => axiosInstance.get(`${apiPath}/${id}`).then((r) => normalizeOne(r.data)))
    );
    return { data: results };
  },
};
