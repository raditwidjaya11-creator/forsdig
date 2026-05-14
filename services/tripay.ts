import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const TRIPAY_MODE = process.env.TRIPAY_MODE || "sandbox";
const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY || "";
const BASE_URL = TRIPAY_MODE === "sandbox" ? "https://tripay.co.id/api-sandbox" : "https://tripay.co.id/api"; // Corrected domain and handling for sandbox/production

/**
 * Standard Tripay Headers
 */
const getHeaders = () => {
  if (!TRIPAY_API_KEY) {
    console.warn("[TRIPAY] Warning: TRIPAY_API_KEY is not set in environment variables!");
  }
  return {
    Authorization: `Bearer ${TRIPAY_API_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  };
};

/**
 * Interface for Tripay Product
 */
export interface TripayProduct {
  code: string;
  product_name: string;
  category: string;
  operator: string;
  price: number;
  status: string;
}

/**
 * Interface for Tripay Payment Channel
 */
export interface TripayPaymentChannel {
  code: string;
  name: string;
  type: string;
  group: string;
}

/**
 * Error handler for Tripay API requests
 */
const handleError = (error: AxiosError<any> | unknown, url: string) => {
  const err = error as any;
  const status = err.response?.status;
  const data = err.response?.data;
  
  console.error(`[TRIPAY ERROR] Failed URL: ${url}`);
  if (status) console.error(`[TRIPAY ERROR] Status Code: ${status}`);
  if (data) console.error(`[TRIPAY ERROR] Response Data:`, JSON.stringify(data, null, 2));
  
  if (status === 404) {
    console.error(`[TRIPAY] Endpoint invalid or resource not found. Check your Tripay account type (PPOB vs Payment Gateway).`);
  }
};

/**
 * Generate signature for Tripay PPOB (PPL)
 * Sign = md5(api_key + api_ref)
 */
const getSignature = (apiRef: string): string => {
  const apiKey = process.env.TRIPAY_API_KEY || "";
  return crypto.createHash("md5").update(`${apiKey}${apiRef}`).digest("hex");
};

/**
 * Fetch all products from Tripay PPOB
 */
export const getProducts = async (): Promise<TripayProduct[]> => {
  const url = `${BASE_URL}/v1/pembelian/produk`;
  try {
    // Some versions of Tripay PPOB API require a POST with empty object
    const response = await axios.post(url, {}, { headers: getHeaders() });
    if (response.data && response.data.success !== false) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to fetch products from Tripay");
  } catch (error: any) {
    handleError(error, url);
    throw error;
  }
};

/**
 * Fetch available payment channels from Tripay (for Payment Gateway, not PPOB)
 */
export const getPaymentChannels = async (): Promise<TripayPaymentChannel[]> => {
  const url = `${BASE_URL}/merchant/payment-channel`;
  try {
    const response = await axios.get(url, { headers: getHeaders() });
    if (response.data && response.data.success !== false) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to fetch payment channels from Tripay");
  } catch (error: any) {
    handleError(error, url);
    throw error;
  }
};

/**
 * Create a transaction in Tripay (PPOB / PPL)
 */
export const createTransaction = async (data: { code: string; customer_no: string; api_ref: string }): Promise<any> => {
  const url = `${BASE_URL}/v1/pembelian/order`;
  const payload = {
    ...data,
    sign: getSignature(data.api_ref)
  };

  try {
    const response = await axios.post(url, payload, { headers: getHeaders() });
    if (response.data && response.data.success !== false) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to create transaction in Tripay");
  } catch (error: unknown) {
    handleError(error, url);
    throw error;
  }
};

/**
 * Check transaction status in Tripay (PPOB / PPL)
 */
export const getTransactionStatus = async (api_ref: string): Promise<any> => {
  const sign = getSignature(api_ref);
  const url = `${BASE_URL}/v1/pembelian/transaksi?api_ref=${api_ref}&sign=${sign}`;
  try {
    const response = await axios.get(url, { headers: getHeaders() });
    if (response.data && response.data.success !== false) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to fetch transaction status from Tripay");
  } catch (error: unknown) {
    handleError(error, url);
    throw error;
  }
};
