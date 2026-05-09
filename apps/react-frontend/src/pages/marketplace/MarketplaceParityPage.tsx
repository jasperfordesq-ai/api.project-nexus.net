// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button, Chip, Input, Skeleton, Tab, Tabs, Textarea } from '@heroui/react';
import {
  BadgePercent,
  BarChart3,
  Box,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  Hash,
  MapPinned,
  PackageCheck,
  QrCode,
  RefreshCw,
  Search,
  ShoppingBag,
  ScanLine,
  Store,
  TicketPercent,
  Truck,
} from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { useAuth, useTenant, useToast } from '@/contexts';
import { usePageTitle } from '@/hooks';
import { api } from '@/lib/api';
import { logError } from '@/lib/logger';

type MarketplaceMode =
  | 'browse'
  | 'collections'
  | 'coupons'
  | 'listing'
  | 'offers'
  | 'orders'
  | 'pickup'
  | 'seller'
  | 'sellerProfile';

type AnyRecord = Record<string, unknown>;

interface MarketplaceListing extends AnyRecord {
  id?: number;
  title?: string;
  description?: string;
  tagline?: string | null;
  price?: number | null;
  priceCurrency?: string;
  price_currency?: string;
  priceType?: string;
  price_type?: string;
  timeCreditPrice?: number | null;
  time_credit_price?: number | null;
  condition?: string;
  quantity?: number;
  location?: string | null;
  localPickup?: boolean;
  local_pickup?: boolean;
  shippingAvailable?: boolean;
  shipping_available?: boolean;
  marketplaceStatus?: string;
  marketplace_status?: string;
  status?: string;
  images?: Array<{ url?: string; altText?: string; alt_text?: string }>;
  seller?: { id?: number; firstName?: string; first_name?: string; lastName?: string; last_name?: string };
  category?: { id?: number; name?: string; slug?: string; icon?: string };
  viewsCount?: number;
  views_count?: number;
  savesCount?: number;
  saves_count?: number;
  contactsCount?: number;
  contacts_count?: number;
  createdAt?: string;
  created_at?: string;
}

interface MarketplaceCategory extends AnyRecord {
  id?: number;
  name?: string;
  slug?: string;
  icon?: string | null;
}

interface MarketplaceOrder extends AnyRecord {
  id?: number;
  marketplaceListingId?: number;
  marketplace_listing_id?: number;
  quantity?: number;
  totalAmount?: number | null;
  total_amount?: number | null;
  timeCreditTotal?: number | null;
  time_credit_total?: number | null;
  currency?: string;
  status?: string;
  deliveryMethod?: string;
  delivery_method?: string;
  trackingNumber?: string | null;
  tracking_number?: string | null;
  createdAt?: string;
  created_at?: string;
  listing?: MarketplaceListing | null;
}

interface MarketplaceOffer extends AnyRecord {
  id?: number;
  marketplaceListingId?: number;
  marketplace_listing_id?: number;
  amount?: number | null;
  timeCreditAmount?: number | null;
  time_credit_amount?: number | null;
  currency?: string;
  status?: string;
  message?: string;
  createdAt?: string;
  created_at?: string;
}

interface SellerProfile extends AnyRecord {
  id?: number;
  userId?: number;
  user_id?: number;
  displayName?: string;
  display_name?: string;
  bio?: string | null;
  sellerType?: string;
  seller_type?: string;
  isVerified?: boolean;
  is_verified?: boolean;
  ratingAverage?: number;
  rating_average?: number;
  ratingCount?: number;
  rating_count?: number;
}

interface SellerDashboard {
  profile?: SellerProfile;
  listings?: number;
  orders?: number;
  pending_offers?: number;
  pendingOffers?: number;
}

interface MerchantCoupon extends AnyRecord {
  id?: number;
  code?: string;
  description?: string;
  discountAmount?: number;
  discount_amount?: number;
  discountType?: string;
  discount_type?: string;
  isActive?: boolean;
  is_active?: boolean;
  expiresAt?: string | null;
  expires_at?: string | null;
}

interface PickupSlot extends AnyRecord {
  id?: number;
  location?: string;
  startsAt?: string;
  starts_at?: string;
  endsAt?: string;
  ends_at?: string;
  capacity?: number;
  isActive?: boolean;
  is_active?: boolean;
}

interface PickupReservation extends AnyRecord {
  id?: number;
  marketplaceOrderId?: number;
  marketplace_order_id?: number;
  marketplacePickupSlotId?: number;
  marketplace_pickup_slot_id?: number;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

interface CouponValidationState {
  status: 'idle' | 'valid' | 'invalid' | 'redeemed';
  message: string;
  coupon?: MerchantCoupon | null;
}

interface CheckoutState {
  orderId?: number;
  paymentId?: string;
  paymentStatus?: string;
  amount?: number | null;
  currency?: string;
}

interface MarketplaceActionHandlers {
  createOrder: (listingId: number, pickupSlotId?: number) => Promise<void>;
  createOffer: (listing: MarketplaceListing) => Promise<void>;
  updateOffer: (offerId: number, action: 'accept' | 'decline' | 'counter' | 'accept-counter' | 'delete') => Promise<void>;
  updateOrder: (orderId: number, action: 'confirm-delivery' | 'cancel') => Promise<void>;
  scanPickup: (code: string) => Promise<void>;
}

interface MarketplaceData {
  categories: MarketplaceCategory[];
  listings: MarketplaceListing[];
  featured: MarketplaceListing[];
  listing: MarketplaceListing | null;
  seller: SellerProfile | null;
  sellerListings: MarketplaceListing[];
  dashboard: SellerDashboard | null;
  purchases: MarketplaceOrder[];
  sales: MarketplaceOrder[];
  sentOffers: MarketplaceOffer[];
  receivedOffers: MarketplaceOffer[];
  coupons: MerchantCoupon[];
  sellerCoupons: MerchantCoupon[];
  couponRedemptions: Record<string, AnyRecord[]>;
  pickupSlots: PickupSlot[];
  pickups: PickupReservation[];
  collections: AnyRecord[];
}

const emptyData: MarketplaceData = {
  categories: [],
  listings: [],
  featured: [],
  listing: null,
  seller: null,
  sellerListings: [],
  dashboard: null,
  purchases: [],
  sales: [],
  sentOffers: [],
  receivedOffers: [],
  coupons: [],
  sellerCoupons: [],
  couponRedemptions: {},
  pickupSlots: [],
  pickups: [],
  collections: [],
};

const marketplaceTitles: Record<MarketplaceMode, string> = {
  browse: 'Marketplace',
  collections: 'Marketplace Collections',
  coupons: 'Coupons',
  listing: 'Marketplace Listing',
  offers: 'Marketplace Offers',
  orders: 'Marketplace Orders',
  pickup: 'Marketplace Pickups',
  seller: 'Seller Workspace',
  sellerProfile: 'Seller Profile',
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function numberValue(record: AnyRecord | null | undefined, ...keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function stringValue(record: AnyRecord | null | undefined, ...keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function boolValue(record: AnyRecord | null | undefined, ...keys: string[]): boolean {
  if (!record) return false;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function dateValue(record: AnyRecord | null | undefined, ...keys: string[]): string {
  const raw = stringValue(record, ...keys);
  if (!raw) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
}

function formatMoney(value: number | null, currency = 'EUR') {
  if (value === null) return null;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
}

function listingPrice(listing: MarketplaceListing) {
  const credits = numberValue(listing, 'timeCreditPrice', 'time_credit_price');
  if (credits !== null) return `${credits} credits`;
  const price = numberValue(listing, 'price');
  const currency = stringValue(listing, 'priceCurrency', 'price_currency') || 'EUR';
  return formatMoney(price, currency) ?? 'Free';
}

function sellerName(profile?: SellerProfile | null) {
  return stringValue(profile, 'displayName', 'display_name') || 'Seller profile';
}

function useMarketplaceMode(): MarketplaceMode {
  const { pathname } = useLocation();
  if (pathname.includes('/seller/coupons') || pathname.startsWith('/coupons') || pathname.includes('/coupons/')) return 'coupons';
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/pickup')) return 'pickup';
  if (pathname.includes('/my-offers')) return 'offers';
  if (pathname.includes('/seller/') && !pathname.includes('/seller/onboard')) return 'sellerProfile';
  if (pathname.includes('/sell') || pathname.includes('/my-listings') || pathname.includes('/become-partner') || pathname.includes('/seller/onboard')) return 'seller';
  if (pathname.includes('/collections')) return 'collections';
  if (/\/marketplace\/\d+/.test(pathname)) return 'listing';
  return 'browse';
}

export function MarketplaceParityPage() {
  const mode = useMarketplaceMode();
  const { pathname } = useLocation();
  const { id, slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { tenantPath } = useTenant();
  const toast = useToast();
  const [data, setData] = useState<MarketplaceData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountAmount: '5',
    discountType: 'fixed',
    expiresAt: '',
  });
  const [sellerForm, setSellerForm] = useState({ displayName: '', bio: '', sellerType: 'private' });
  const [pickupForm, setPickupForm] = useState({
    location: '',
    startsAt: '',
    endsAt: '',
    capacity: '4',
  });
  const [pickupScanCode, setPickupScanCode] = useState('');
  const [pickupScanResult, setPickupScanResult] = useState<CouponValidationState>({ status: 'idle', message: 'No pickup scan submitted.' });
  const [couponTool, setCouponTool] = useState({
    code: '',
    orderId: '',
  });
  const [couponStatus, setCouponStatus] = useState<CouponValidationState>({ status: 'idle', message: 'Enter a coupon code to validate it against the live API.' });
  const [checkoutForm, setCheckoutForm] = useState({
    quantity: '1',
    deliveryMethod: 'local_pickup',
    shippingAddress: '',
    couponCode: '',
  });
  const [checkout, setCheckout] = useState<CheckoutState>({});

  usePageTitle(marketplaceTitles[mode]);

  const isSellerCouponRoute = pathname.includes('/marketplace/seller/coupons');
  const isCouponEditRoute = Boolean(isSellerCouponRoute && id);
  const listingId = mode === 'listing' && id ? Number(id) : null;
  const sellerId = mode === 'sellerProfile' && id ? Number(id) : null;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const next: MarketplaceData = { ...emptyData };
      const categoryRequest = api.get<MarketplaceCategory[]>('/v2/marketplace/categories', { skipAuth: true });

      if (mode === 'browse') {
        const endpoint = pathname.includes('/free')
          ? '/v2/marketplace/listings/free?limit=24'
          : pathname.includes('/map')
            ? '/v2/marketplace/listings/nearby?radius=50'
            : `/v2/marketplace/listings?limit=24${query ? `&q=${encodeURIComponent(query)}` : ''}${slug ? `&category=${encodeURIComponent(slug)}` : ''}`;
        const [categoriesRes, listingsRes, featuredRes] = await Promise.all([
          categoryRequest,
          api.get<MarketplaceListing[]>(endpoint, { skipAuth: true }),
          api.get<MarketplaceListing[]>('/v2/marketplace/listings/featured?limit=6', { skipAuth: true }),
        ]);
        next.categories = asArray(categoriesRes.data);
        next.listings = asArray(listingsRes.data);
        next.featured = asArray(featuredRes.data);
      } else if (mode === 'listing' && listingId) {
        const [categoriesRes, listingRes, slotsRes] = await Promise.all([
          categoryRequest,
          api.get<MarketplaceListing>(`/v2/marketplace/listings/${listingId}`, { skipAuth: true }),
          api.get<PickupSlot[]>(`/v2/marketplace/listings/${listingId}/pickup-slots`, { skipAuth: true }).catch(() => null),
        ]);
        next.categories = asArray(categoriesRes.data);
        next.listing = listingRes.data ?? null;
        next.pickupSlots = asArray(slotsRes?.data);
      } else if (mode === 'sellerProfile' && sellerId) {
        const [sellerRes, listingsRes] = await Promise.all([
          api.get<SellerProfile>(`/v2/marketplace/sellers/${sellerId}`, { skipAuth: true }),
          api.get<MarketplaceListing[]>(`/v2/marketplace/sellers/${sellerId}/listings`, { skipAuth: true }),
        ]);
        next.seller = sellerRes.data ?? null;
        next.sellerListings = asArray(listingsRes.data);
      } else if (mode === 'collections' && isAuthenticated) {
        const [collectionsRes, savedRes] = await Promise.all([
          api.get<AnyRecord[]>('/v2/marketplace/collections'),
          api.get<MarketplaceListing[]>('/v2/marketplace/listings/saved'),
        ]);
        next.collections = asArray(collectionsRes.data);
        next.listings = asArray(savedRes.data);
      } else if (mode === 'seller') {
        const dashboardRes = await api.get<SellerDashboard>('/v2/marketplace/seller/dashboard');
        const sellerUserId = numberValue(dashboardRes.data?.profile, 'userId', 'user_id');
        const [listingsRes, promotionsRes] = await Promise.all([
          api.get<MarketplaceListing[]>(`/v2/marketplace/listings?limit=100${sellerUserId ? `&user_id=${sellerUserId}` : ''}`),
          api.get<AnyRecord[]>('/v2/marketplace/promotions/mine').catch(() => null),
        ]);
        next.dashboard = dashboardRes.data ?? null;
        next.listings = asArray(listingsRes.data);
        next.collections = asArray(promotionsRes?.data);
        if (dashboardRes.data?.profile) {
          setSellerForm({
            displayName: sellerName(dashboardRes.data.profile),
            bio: stringValue(dashboardRes.data.profile, 'bio'),
            sellerType: stringValue(dashboardRes.data.profile, 'sellerType', 'seller_type') || 'private',
          });
        }
      } else if (mode === 'orders') {
        const [purchasesRes, salesRes] = await Promise.all([
          api.get<MarketplaceOrder[]>('/v2/marketplace/orders/purchases'),
          api.get<MarketplaceOrder[]>('/v2/marketplace/orders/sales'),
        ]);
        next.purchases = asArray(purchasesRes.data);
        next.sales = asArray(salesRes.data);
      } else if (mode === 'offers') {
        const [sentRes, receivedRes] = await Promise.all([
          api.get<MarketplaceOffer[]>('/v2/marketplace/my-offers/sent'),
          api.get<MarketplaceOffer[]>('/v2/marketplace/my-offers/received'),
        ]);
        next.sentOffers = asArray(sentRes.data);
        next.receivedOffers = asArray(receivedRes.data);
      } else if (mode === 'pickup') {
        const [slotsRes, pickupsRes] = await Promise.all([
          api.get<PickupSlot[]>('/v2/marketplace/seller/pickup-slots'),
          api.get<PickupReservation[]>('/v2/marketplace/me/pickups'),
        ]);
        next.pickupSlots = asArray(slotsRes.data);
        next.pickups = asArray(pickupsRes.data);
      } else if (mode === 'coupons') {
        const requests = [
          api.get<MerchantCoupon[]>('/v2/coupons', { skipAuth: true }),
          isAuthenticated || isSellerCouponRoute
            ? api.get<MerchantCoupon[]>('/v2/marketplace/seller/coupons').catch(() => null)
            : Promise.resolve(null),
        ] as const;
        const [publicCouponsRes, sellerCouponsRes] = await Promise.all(requests);
        next.coupons = asArray(publicCouponsRes.data);
        next.sellerCoupons = asArray(sellerCouponsRes?.data);
        if (next.sellerCoupons.length > 0) {
          const redemptionPairs = await Promise.all(
            next.sellerCoupons
              .filter((coupon) => typeof coupon.id === 'number')
              .slice(0, 12)
              .map(async (coupon) => {
                const res = await api.get<AnyRecord[]>(`/v2/marketplace/seller/coupons/${coupon.id}/redemptions`).catch(() => null);
                return [String(coupon.id), asArray<AnyRecord>(res?.data)] as const;
              })
          );
          next.couponRedemptions = Object.fromEntries(redemptionPairs);
        }
      }

      setData(next);
    } catch (err) {
      logError('MarketplaceParityPage.loadData', err);
      setError('Marketplace data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isSellerCouponRoute, listingId, mode, pathname, query, sellerId, slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isCouponEditRoute) return;
    const coupon = data.sellerCoupons.find((item) => item.id === Number(id));
    if (!coupon) return;
    setCouponForm({
      code: stringValue(coupon, 'code'),
      description: stringValue(coupon, 'description'),
      discountAmount: String(numberValue(coupon, 'discountAmount', 'discount_amount') ?? 0),
      discountType: stringValue(coupon, 'discountType', 'discount_type') || 'fixed',
      expiresAt: stringValue(coupon, 'expiresAt', 'expires_at').slice(0, 10),
    });
  }, [data.sellerCoupons, id, isCouponEditRoute]);

  const submitSellerProfile = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/v2/marketplace/seller/onboard', {
        displayName: sellerForm.displayName,
        bio: sellerForm.bio,
        sellerType: sellerForm.sellerType,
      });
      if (res.success) {
        toast.success('Seller profile saved');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not save seller profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const submitCoupon = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        code: couponForm.code || undefined,
        description: couponForm.description,
        discountAmount: Number(couponForm.discountAmount) || 0,
        discountType: couponForm.discountType,
        expiresAt: couponForm.expiresAt || null,
      };
      const endpoint = isCouponEditRoute
        ? `/v2/marketplace/seller/coupons/${id}`
        : '/v2/marketplace/seller/coupons';
      const res = isCouponEditRoute ? await api.put(endpoint, payload) : await api.post(endpoint, payload);
      if (res.success) {
        toast.success(isCouponEditRoute ? 'Coupon updated' : 'Coupon created');
        setCouponForm({ code: '', description: '', discountAmount: '5', discountType: 'fixed', expiresAt: '' });
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not save coupon');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const submitPickupSlot = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/v2/marketplace/seller/pickup-slots', {
        location: pickupForm.location,
        startsAt: pickupForm.startsAt,
        endsAt: pickupForm.endsAt,
        capacity: Number(pickupForm.capacity) || 1,
      });
      if (res.success) {
        toast.success('Pickup slot created');
        setPickupForm({ location: '', startsAt: '', endsAt: '', capacity: '4' });
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not create pickup slot');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCoupon = async (couponId: number) => {
    const res = await api.delete(`/v2/marketplace/seller/coupons/${couponId}`);
    if (res.success) {
      toast.success('Coupon deleted');
      await loadData();
    } else {
      toast.error(res.error ?? 'Could not delete coupon');
    }
  };

  const validateCoupon = async (code: string, manageSaving = true) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setCouponStatus({ status: 'invalid', message: 'Enter a coupon code before validating.' });
      return null;
    }

    if (manageSaving) setIsSaving(true);
    try {
      const res = await api.post<MerchantCoupon | null>('/v2/coupons/validate', { code: normalized }, { skipAuth: true });
      if (res.success && res.data) {
        setCouponStatus({ status: 'valid', message: `${normalized} is active and can be redeemed.`, coupon: res.data });
        return res.data;
      }
      setCouponStatus({ status: 'invalid', message: res.error ?? `${normalized} is not currently redeemable.`, coupon: null });
      return null;
    } finally {
      if (manageSaving) setIsSaving(false);
    }
  };

  const redeemCoupon = async (code: string, orderId?: string | number) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setCouponStatus({ status: 'invalid', message: 'Enter a coupon code before redeeming.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post('/v2/coupons/redeem-qr', {
        code: normalized,
        qr_payload: normalized,
        order_id: orderId ? Number(orderId) : undefined,
      });
      if (res.success) {
        setCouponStatus({ status: 'redeemed', message: `${normalized} was redeemed successfully.` });
        setCouponTool({ code: '', orderId: '' });
        await loadData();
      } else {
        setCouponStatus({ status: 'invalid', message: res.error ?? 'Coupon could not be redeemed.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const createOrder = async (targetListingId: number, pickupSlotId?: number) => {
    if (!isAuthenticated) {
      toast.error('Sign in to start an order');
      return;
    }
    setIsSaving(true);
    try {
      const quantity = Math.max(1, Number(checkoutForm.quantity) || 1);
      const selectedCoupon = checkoutForm.couponCode.trim()
        ? await validateCoupon(checkoutForm.couponCode, false)
        : couponStatus.coupon;
      const listing = data.listing?.id === targetListingId ? data.listing : null;
      const price = listing ? numberValue(listing, 'price') : null;
      const currency = listing ? stringValue(listing, 'priceCurrency', 'price_currency') || 'EUR' : 'EUR';
      const discount = numberValue(selectedCoupon, 'discountAmount', 'discount_amount') ?? 0;
      const amount = price === null ? null : Math.max(0, (price * quantity) - discount);
      const orderRes = await api.post<MarketplaceOrder>('/v2/marketplace/orders', {
        listingId: targetListingId,
        quantity,
        deliveryMethod: pickupSlotId ? 'pickup' : checkoutForm.deliveryMethod,
        shippingAddress: checkoutForm.deliveryMethod === 'shipping' ? checkoutForm.shippingAddress : null,
        couponCode: selectedCoupon?.code ?? (checkoutForm.couponCode.trim().toUpperCase() || null),
      });
      if (!orderRes.success || !orderRes.data?.id) {
        toast.error(orderRes.error ?? 'Could not create order');
        return;
      }
      if (pickupSlotId) {
        await api.post(`/v2/marketplace/orders/${orderRes.data.id}/pickup-reservation`, { pickupSlotId });
      }
      setCheckout({
        orderId: orderRes.data.id,
        amount,
        currency,
        paymentStatus: amount === null || amount === 0 ? 'not_required' : 'order_created',
      });
      toast.success('Order created');
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const createPaymentIntent = async () => {
    if (!checkout.orderId) {
      toast.error('Create an order before starting payment');
      return;
    }
    if (!checkout.amount || checkout.amount <= 0) {
      toast.error('This order does not require a card payment');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post<AnyRecord>('/v2/marketplace/payments/create-intent', {
        orderId: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency ?? 'EUR',
      });
      const paymentId = stringValue(res.data, 'id', 'payment_id');
      if (res.success && paymentId) {
        setCheckout((prev) => ({
          ...prev,
          paymentId,
          paymentStatus: stringValue(res.data, 'status') || 'requires_confirmation',
        }));
        toast.success('Payment intent created');
      } else {
        toast.error(res.error ?? 'Could not create payment intent');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const confirmPayment = async () => {
    if (!checkout.paymentId) {
      toast.error('Create a payment intent first');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post<AnyRecord>('/v2/marketplace/payments/confirm', { paymentId: checkout.paymentId });
      if (res.success) {
        setCheckout((prev) => ({ ...prev, paymentStatus: stringValue(res.data, 'status') || 'confirmed' }));
        toast.success('Payment confirmed');
      } else {
        toast.error(res.error ?? 'Could not confirm payment');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const refreshPaymentStatus = async () => {
    if (!checkout.paymentId) return;
    setIsSaving(true);
    try {
      const res = await api.get<AnyRecord>(`/v2/marketplace/payments/${checkout.paymentId}/status`);
      if (res.success) {
        setCheckout((prev) => ({ ...prev, paymentStatus: stringValue(res.data, 'status') || prev.paymentStatus }));
      } else {
        toast.error(res.error ?? 'Could not refresh payment status');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const createOffer = async (listing: MarketplaceListing) => {
    if (!listing.id) return;
    if (!isAuthenticated) {
      toast.error('Sign in to make an offer');
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.post(`/v2/marketplace/listings/${listing.id}/offers`, {
        amount: numberValue(listing, 'price'),
        timeCreditAmount: numberValue(listing, 'timeCreditPrice', 'time_credit_price'),
        message: 'Offer submitted from marketplace workspace',
      });
      if (res.success) {
        toast.success('Offer sent');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not send offer');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateOffer = async (offerId: number, action: 'accept' | 'decline' | 'counter' | 'accept-counter' | 'delete') => {
    setIsSaving(true);
    try {
      const endpoint = `/v2/marketplace/offers/${offerId}${action === 'delete' ? '' : `/${action}`}`;
      const res = action === 'delete'
        ? await api.delete(endpoint)
        : action === 'counter'
          ? await api.put(endpoint, { amount: null, timeCreditAmount: null, message: 'Counter requested from seller workspace' })
          : await api.put(endpoint, {});
      if (res.success) {
        toast.success(`Offer ${action.replace('-', ' ')}`);
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not update offer');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateOrder = async (orderId: number, action: 'confirm-delivery' | 'cancel') => {
    setIsSaving(true);
    try {
      const res = await api.put(`/v2/marketplace/orders/${orderId}/${action}`, {});
      if (res.success) {
        toast.success(action === 'cancel' ? 'Order cancelled' : 'Delivery confirmed');
        await loadData();
      } else {
        toast.error(res.error ?? 'Could not update order');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const scanPickup = async (code: string) => {
    const normalized = code.trim();
    if (!normalized) {
      setPickupScanResult({ status: 'invalid', message: 'Enter the QR or manual pickup code first.' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.post<AnyRecord>('/v2/marketplace/seller/pickup-scan', { code: normalized });
      if (res.success) {
        setPickupScanResult({ status: 'redeemed', message: `Pickup ${stringValue(res.data, 'status') || 'accepted'} for ${normalized}.` });
        toast.success('Pickup code scanned');
        setPickupScanCode('');
        await loadData();
      } else {
        setPickupScanResult({ status: 'invalid', message: res.error ?? 'Pickup code could not be scanned.' });
        toast.error(res.error ?? 'Could not scan pickup code');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const actions: MarketplaceActionHandlers = {
    createOrder,
    createOffer,
    updateOffer,
    updateOrder,
    scanPickup,
  };

  const header = useMemo(() => {
    const subtitle: Record<MarketplaceMode, string> = {
      browse: 'Browse marketplace listings, categories, maps, free items, and seller storefronts.',
      collections: 'Review saved listings and marketplace collections.',
      coupons: 'Browse active offers and manage seller coupon codes.',
      listing: 'View listing detail, pickup options, seller context, and order entry points.',
      offers: 'Track offers you have sent and offers waiting for seller action.',
      orders: 'Follow buyer purchases and seller sales from the same order surface.',
      pickup: 'Manage pickup slots and member pickup reservations.',
      seller: 'Manage seller onboarding, own listings, promotions, and commercial status.',
      sellerProfile: 'View seller reputation and active marketplace listings.',
    };

    return (
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <Chip variant="flat" color="primary">{marketplaceTitles[mode]}</Chip>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-normal">
            {marketplaceTitles[mode]}
          </h1>
          <p className="text-theme-muted mt-1 max-w-3xl">{subtitle[mode]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="flat"
            className="bg-theme-elevated text-theme-primary"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={loadData}
          >
            Refresh
          </Button>
          <Link to={tenantPath('/marketplace')}>
            <Button variant="flat" className="bg-theme-elevated text-theme-primary" startContent={<ShoppingBag className="w-4 h-4" />}>
              Browse
            </Button>
          </Link>
          <Link to={tenantPath('/marketplace/sell')}>
            <Button className="bg-gradient-to-r from-emerald-500 to-sky-600 text-white" startContent={<Store className="w-4 h-4" />}>
              Seller Tools
            </Button>
          </Link>
        </div>
      </div>
    );
  }, [loadData, mode, tenantPath]);

  if (isLoading) {
    return (
      <section className="space-y-5">
        {header}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <GlassCard key={item} className="p-5 space-y-3">
              <Skeleton className="rounded-lg"><div className="h-6 w-2/3 rounded-lg bg-default-300" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-4 w-full rounded-lg bg-default-200" /></Skeleton>
              <Skeleton className="rounded-lg"><div className="h-20 w-full rounded-lg bg-default-200" /></Skeleton>
            </GlassCard>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        {header}
        <GlassCard className="p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button color="primary" variant="flat" onPress={loadData}>Try again</Button>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {header}
      {mode === 'browse' && (
        <>
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search marketplace"
                startContent={<Search className="w-4 h-4 text-theme-subtle" aria-hidden="true" />}
                classNames={{ inputWrapper: 'bg-theme-elevated border-theme-default' }}
              />
              <Button color="primary" onPress={loadData} startContent={<Search className="w-4 h-4" />}>Search</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.categories.slice(0, 10).map((category) => (
                <Link key={category.id ?? category.slug} to={tenantPath(`/marketplace/category/${category.slug ?? category.id}`)}>
                  <Chip variant="flat" className="cursor-pointer">{category.name ?? category.slug}</Chip>
                </Link>
              ))}
            </div>
          </GlassCard>

          {data.featured.length > 0 && (
            <WorkflowPanel title="Featured listings" icon={<TicketPercent className="w-5 h-5" />}>
              <ListingGrid listings={data.featured} />
            </WorkflowPanel>
          )}

          <WorkflowPanel title={pathname.includes('/free') ? 'Free items' : 'Marketplace results'} icon={<ShoppingBag className="w-5 h-5" />}>
            <ListingGrid listings={data.listings} />
          </WorkflowPanel>
        </>
      )}

      {mode === 'listing' && data.listing && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <GlassCard className="p-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <ListingImage listing={data.listing} large />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-theme-primary">{data.listing.title}</h2>
                <p className="text-theme-muted mt-2">{data.listing.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Chip color="success" variant="flat">{listingPrice(data.listing)}</Chip>
                  <Chip variant="flat">{stringValue(data.listing, 'condition') || 'condition unset'}</Chip>
                  <Chip variant="flat">{stringValue(data.listing, 'marketplaceStatus', 'marketplace_status') || 'available'}</Chip>
                </div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-5 space-y-4">
            <h3 className="font-semibold text-theme-primary">Checkout</h3>
            <Link to={tenantPath(`/marketplace/seller/${data.listing.userId ?? data.listing.seller?.id ?? ''}`)}>
              <Button className="w-full justify-start" variant="flat" startContent={<Store className="w-4 h-4" />}>Seller storefront</Button>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={1}
                label="Quantity"
                value={checkoutForm.quantity}
                onChange={(event) => setCheckoutForm((prev) => ({ ...prev, quantity: event.target.value }))}
              />
              <Input
                label="Coupon"
                value={checkoutForm.couponCode}
                onChange={(event) => setCheckoutForm((prev) => ({ ...prev, couponCode: event.target.value.toUpperCase() }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['local_pickup', 'shipping'].map((method) => (
                <Button
                  key={method}
                  size="sm"
                  variant={checkoutForm.deliveryMethod === method ? 'solid' : 'flat'}
                  color={checkoutForm.deliveryMethod === method ? 'primary' : 'default'}
                  onPress={() => setCheckoutForm((prev) => ({ ...prev, deliveryMethod: method }))}
                >
                  {method === 'shipping' ? 'Shipping' : 'Pickup'}
                </Button>
              ))}
            </div>
            {checkoutForm.deliveryMethod === 'shipping' && (
              <Textarea
                label="Shipping address"
                minRows={3}
                value={checkoutForm.shippingAddress}
                onChange={(event) => setCheckoutForm((prev) => ({ ...prev, shippingAddress: event.target.value }))}
              />
            )}
            <Button className="w-full justify-start" color="primary" isLoading={isSaving} startContent={<CreditCard className="w-4 h-4" />} onPress={() => data.listing?.id && createOrder(data.listing.id)}>
              Create order
            </Button>
            <div className="rounded-lg bg-theme-elevated p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-theme-primary">Payment</span>
                <Chip size="sm" variant="flat">{checkout.paymentStatus ?? 'not started'}</Chip>
              </div>
              <p className="text-xs text-theme-muted">
                {checkout.orderId ? `Order #${checkout.orderId}` : 'Create an order before requesting a payment intent.'}
                {checkout.amount !== undefined && checkout.amount !== null ? ` | ${formatMoney(checkout.amount, checkout.currency ?? 'EUR')}` : ''}
              </p>
              {checkout.paymentId && <p className="font-mono text-xs text-theme-subtle break-all">{checkout.paymentId}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="flat" isLoading={isSaving} onPress={createPaymentIntent}>Intent</Button>
                <Button size="sm" variant="flat" isLoading={isSaving} onPress={confirmPayment}>Confirm</Button>
                <Button size="sm" variant="flat" isIconOnly aria-label="Refresh payment" isLoading={isSaving} onPress={refreshPaymentStatus}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button className="w-full justify-start" variant="flat" isLoading={isSaving} startContent={<ClipboardCheck className="w-4 h-4" />} onPress={() => data.listing && createOffer(data.listing)}>
              Make offer
            </Button>
            {data.pickupSlots.length > 0 && (
              <div className="pt-2 border-t border-theme-default">
                <p className="text-sm font-medium text-theme-primary mb-2">Pickup windows</p>
                <div className="space-y-2">
                  {data.pickupSlots.slice(0, 3).map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      className="w-full text-left"
                      onClick={() => data.listing?.id && slot.id && createOrder(data.listing.id, slot.id)}
                    >
                      <SmallRow title={slot.location || 'Pickup slot'} detail={`${dateValue(slot, 'startsAt', 'starts_at')} · ${slot.capacity ?? 1} capacity`} status="Reserve" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {mode === 'sellerProfile' && (
        <>
          <MetricStrip
            items={[
              { label: 'Rating', value: String(numberValue(data.seller, 'ratingAverage', 'rating_average') ?? 0) },
              { label: 'Reviews', value: String(numberValue(data.seller, 'ratingCount', 'rating_count') ?? 0) },
              { label: 'Active listings', value: String(data.sellerListings.length) },
            ]}
          />
          <WorkflowPanel title={sellerName(data.seller)} icon={<Store className="w-5 h-5" />}>
            {data.seller?.bio && <p className="text-theme-muted mb-4">{data.seller.bio}</p>}
            <ListingGrid listings={data.sellerListings} />
          </WorkflowPanel>
        </>
      )}

      {mode === 'seller' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          <GlassCard className="p-5">
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Seller profile</h2>
            <form className="space-y-4" onSubmit={submitSellerProfile}>
              <Input label="Display name" value={sellerForm.displayName} onChange={(event) => setSellerForm((prev) => ({ ...prev, displayName: event.target.value }))} />
              <Textarea label="Bio" value={sellerForm.bio} onChange={(event) => setSellerForm((prev) => ({ ...prev, bio: event.target.value }))} />
              <Input label="Seller type" value={sellerForm.sellerType} onChange={(event) => setSellerForm((prev) => ({ ...prev, sellerType: event.target.value }))} />
              <Button type="submit" color="primary" isLoading={isSaving} startContent={<Store className="w-4 h-4" />}>Save seller profile</Button>
            </form>
          </GlassCard>
          <div className="space-y-4">
            <MetricStrip
              items={[
                { label: 'Listings', value: String(data.dashboard?.listings ?? data.listings.length) },
                { label: 'Orders', value: String(data.dashboard?.orders ?? 0) },
                { label: 'Pending offers', value: String(data.dashboard?.pending_offers ?? data.dashboard?.pendingOffers ?? 0) },
                { label: 'Promotions', value: String(data.collections.length) },
              ]}
            />
            <WorkflowPanel title="Seller listings" icon={<BriefcaseBusiness className="w-5 h-5" />}>
              <ListingGrid listings={data.listings} />
            </WorkflowPanel>
          </div>
        </div>
      )}

      {mode === 'orders' && (
        <Tabs defaultSelectedKey={pathname.includes('/sales') ? 'sales' : 'purchases'} variant="underlined">
          <Tab key="purchases" title="Purchases">
            <OrderList orders={data.purchases} emptyTitle="No purchases yet" onUpdateOrder={actions.updateOrder} />
          </Tab>
          <Tab key="sales" title="Sales">
            <OrderList orders={data.sales} emptyTitle="No sales yet" onUpdateOrder={actions.updateOrder} />
          </Tab>
        </Tabs>
      )}

      {mode === 'offers' && (
        <Tabs defaultSelectedKey="received" variant="underlined">
          <Tab key="received" title={`Received (${data.receivedOffers.length})`}>
            <OfferList offers={data.receivedOffers} onUpdateOffer={actions.updateOffer} canModerate />
          </Tab>
          <Tab key="sent" title={`Sent (${data.sentOffers.length})`}>
            <OfferList offers={data.sentOffers} onUpdateOffer={actions.updateOffer} />
          </Tab>
        </Tabs>
      )}

      {mode === 'coupons' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          <div className="space-y-4">
            {isSellerCouponRoute && (
              <GlassCard className="p-5">
                <h2 className="text-lg font-semibold text-theme-primary mb-4">{isCouponEditRoute ? 'Edit coupon' : 'New coupon'}</h2>
                <form className="space-y-4" onSubmit={submitCoupon}>
                  <Input label="Code" value={couponForm.code} onChange={(event) => setCouponForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} />
                  <Textarea label="Description" value={couponForm.description} onChange={(event) => setCouponForm((prev) => ({ ...prev, description: event.target.value }))} />
                  <Input type="number" label="Discount" value={couponForm.discountAmount} onChange={(event) => setCouponForm((prev) => ({ ...prev, discountAmount: event.target.value }))} />
                  <Input label="Discount type" value={couponForm.discountType} onChange={(event) => setCouponForm((prev) => ({ ...prev, discountType: event.target.value }))} />
                  <Input type="date" label="Expires" value={couponForm.expiresAt} onChange={(event) => setCouponForm((prev) => ({ ...prev, expiresAt: event.target.value }))} />
                  <Button type="submit" color="primary" isLoading={isSaving} startContent={<BadgePercent className="w-4 h-4" />}>
                    Save coupon
                  </Button>
                </form>
              </GlassCard>
            )}
            <GlassCard className="p-5">
              <h2 className="text-lg font-semibold text-theme-primary mb-4">Validate or redeem</h2>
              <div className="space-y-4">
                <Input
                  label="Coupon code or QR payload"
                  value={couponTool.code}
                  onChange={(event) => setCouponTool((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  startContent={<QrCode className="w-4 h-4 text-theme-subtle" />}
                />
                <Input
                  label="Order ID"
                  value={couponTool.orderId}
                  onChange={(event) => setCouponTool((prev) => ({ ...prev, orderId: event.target.value }))}
                  startContent={<Hash className="w-4 h-4 text-theme-subtle" />}
                />
                <div className="flex flex-wrap gap-2">
                  <Button color="primary" variant="flat" isLoading={isSaving} startContent={<BadgePercent className="w-4 h-4" />} onPress={() => validateCoupon(couponTool.code)}>
                    Validate
                  </Button>
                  <Button color="success" variant="flat" isLoading={isSaving} startContent={<ScanLine className="w-4 h-4" />} onPress={() => redeemCoupon(couponTool.code, couponTool.orderId)}>
                    Redeem
                  </Button>
                </div>
                <StatusCallout status={couponStatus.status} message={couponStatus.message} />
              </div>
            </GlassCard>
          </div>
          <div className="space-y-4">
            <CouponList title="Active coupons" coupons={data.coupons} />
            {isAuthenticated && (
              <CouponList title="Seller coupons" coupons={data.sellerCoupons} redemptions={data.couponRedemptions} editable onDelete={deleteCoupon} />
            )}
          </div>
        </div>
      )}

      {mode === 'pickup' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          {pathname.includes('/seller/pickup-slots') && (
            <GlassCard className="p-5">
              <h2 className="text-lg font-semibold text-theme-primary mb-4">New pickup slot</h2>
              <form className="space-y-4" onSubmit={submitPickupSlot}>
                <Input label="Location" value={pickupForm.location} onChange={(event) => setPickupForm((prev) => ({ ...prev, location: event.target.value }))} />
                <Input type="datetime-local" label="Starts" value={pickupForm.startsAt} onChange={(event) => setPickupForm((prev) => ({ ...prev, startsAt: event.target.value }))} />
                <Input type="datetime-local" label="Ends" value={pickupForm.endsAt} onChange={(event) => setPickupForm((prev) => ({ ...prev, endsAt: event.target.value }))} />
                <Input type="number" label="Capacity" value={pickupForm.capacity} onChange={(event) => setPickupForm((prev) => ({ ...prev, capacity: event.target.value }))} />
                <Button type="submit" color="primary" isLoading={isSaving} startContent={<CalendarClock className="w-4 h-4" />}>Create slot</Button>
              </form>
            </GlassCard>
          )}
          {pathname.includes('/seller/pickup-scan') && (
            <GlassCard className="p-5">
              <h2 className="text-lg font-semibold text-theme-primary mb-4">Pickup QR scan</h2>
              <div className="space-y-4">
                <div className="rounded-lg bg-theme-elevated p-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" aria-hidden="true" />
                    <p className="text-sm font-medium text-theme-primary">Manual fallback</p>
                  </div>
                  <p className="text-xs text-theme-muted mt-1">Paste a QR payload, typed pickup code, or reservation reference from the member device.</p>
                </div>
                <Input
                  label="Pickup code"
                  value={pickupScanCode}
                  onChange={(event) => setPickupScanCode(event.target.value)}
                  startContent={<Hash className="w-4 h-4 text-theme-subtle" />}
                />
                <Button color="primary" isLoading={isSaving} startContent={<PackageCheck className="w-4 h-4" />} onPress={() => scanPickup(pickupScanCode)}>
                  Confirm pickup
                </Button>
                <StatusCallout status={pickupScanResult.status} message={pickupScanResult.message} />
              </div>
            </GlassCard>
          )}
          <div className={pathname.includes('/seller/pickup-slots') || pathname.includes('/seller/pickup-scan') ? 'space-y-4' : 'xl:col-span-2 space-y-4'}>
            <PickupList title="Pickup slots" slots={data.pickupSlots} />
            <ReservationList reservations={data.pickups} />
          </div>
        </div>
      )}

      {mode === 'collections' && (
        <div className="space-y-4">
          {!isAuthenticated ? (
            <EmptyState
              icon={<PackageCheck className="w-12 h-12" />}
              title="Sign in to view collections"
              description="Saved listings and collections are attached to your member account."
            />
          ) : (
            <>
              <MetricStrip items={[{ label: 'Collections', value: String(data.collections.length) }, { label: 'Saved listings', value: String(data.listings.length) }]} />
              <WorkflowPanel title="Saved listings" icon={<PackageCheck className="w-5 h-5" />}>
                <ListingGrid listings={data.listings} />
              </WorkflowPanel>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function WorkflowPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-theme-elevated flex items-center justify-center text-primary">{icon}</div>
        <h2 className="text-lg font-semibold text-theme-primary">{title}</h2>
      </div>
      {children}
    </GlassCard>
  );
}

function ListingGrid({ listings }: { listings: MarketplaceListing[] }) {
  if (listings.length === 0) {
    return <EmptyState icon={<ShoppingBag className="w-12 h-12" />} title="No marketplace listings" description="Listings will appear here when they are available." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id ?? listing.title} listing={listing} />
      ))}
    </div>
  );
}

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  const { tenantPath } = useTenant();
  const status = stringValue(listing, 'marketplaceStatus', 'marketplace_status') || stringValue(listing, 'status') || 'available';

  return (
    <Link to={tenantPath(`/marketplace/${listing.id}`)}>
      <article>
        <GlassCard className="p-4 h-full hover:scale-[1.01] transition-transform">
          <ListingImage listing={listing} />
          <div className="mt-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-theme-primary line-clamp-2">{listing.title}</h3>
              <Chip size="sm" color="success" variant="flat">{listingPrice(listing)}</Chip>
            </div>
            <p className="text-sm text-theme-muted line-clamp-2">{listing.tagline || listing.description}</p>
            <div className="flex flex-wrap gap-2">
              <Chip size="sm" variant="flat">{status}</Chip>
              {boolValue(listing, 'localPickup', 'local_pickup') && <Chip size="sm" variant="flat" startContent={<MapPinned className="w-3 h-3" />}>Pickup</Chip>}
              {boolValue(listing, 'shippingAvailable', 'shipping_available') && <Chip size="sm" variant="flat" startContent={<Truck className="w-3 h-3" />}>Shipping</Chip>}
            </div>
          </div>
        </GlassCard>
      </article>
    </Link>
  );
}

function ListingImage({ listing, large = false }: { listing: MarketplaceListing; large?: boolean }) {
  const firstImage = Array.isArray(listing.images) ? listing.images[0] : undefined;
  const url = firstImage?.url;
  const classes = large ? 'w-full sm:w-64 h-52' : 'w-full h-36';

  if (!url) {
    return (
      <div className={`${classes} rounded-lg bg-theme-elevated flex items-center justify-center flex-shrink-0`}>
        <Box className="w-9 h-9 text-theme-subtle" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={firstImage?.altText ?? firstImage?.alt_text ?? listing.title ?? 'Marketplace listing'}
      className={`${classes} rounded-lg object-cover flex-shrink-0`}
      loading="lazy"
    />
  );
}

function MetricStrip({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <GlassCard key={item.label} className="p-4">
          <p className="text-xs uppercase tracking-wide text-theme-subtle">{item.label}</p>
          <p className="text-2xl font-bold text-theme-primary mt-1">{item.value}</p>
        </GlassCard>
      ))}
    </div>
  );
}

function SmallRow({ title, detail, status }: { title: string; detail?: string; status?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-theme-elevated p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-theme-primary truncate">{title}</p>
        {detail && <p className="text-xs text-theme-muted truncate">{detail}</p>}
      </div>
      {status && <Chip size="sm" variant="flat">{status}</Chip>}
    </div>
  );
}

function StatusCallout({ status, message }: CouponValidationState) {
  const color = status === 'valid' || status === 'redeemed' ? 'success' : status === 'invalid' ? 'danger' : 'default';
  return (
    <div className="rounded-lg bg-theme-elevated p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-theme-muted">{message}</p>
        <Chip size="sm" variant="flat" color={color}>{status}</Chip>
      </div>
    </div>
  );
}

function OrderList({ orders, emptyTitle, onUpdateOrder }: { orders: MarketplaceOrder[]; emptyTitle: string; onUpdateOrder: MarketplaceActionHandlers['updateOrder'] }) {
  if (orders.length === 0) {
    return <EmptyState icon={<ClipboardCheck className="w-12 h-12" />} title={emptyTitle} description="Marketplace orders will appear here." />;
  }

  return (
    <div className="space-y-3 mt-4">
      {orders.map((order) => {
        const amount = numberValue(order, 'totalAmount', 'total_amount');
        const credits = numberValue(order, 'timeCreditTotal', 'time_credit_total');
        return (
          <GlassCard key={order.id} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-theme-primary">{order.listing?.title ?? `Order #${order.id}`}</p>
                <p className="text-sm text-theme-muted">
                  {dateValue(order, 'createdAt', 'created_at')} · {stringValue(order, 'deliveryMethod', 'delivery_method') || 'pickup'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip variant="flat">{order.status ?? 'pending'}</Chip>
                <Chip color="success" variant="flat">{credits !== null ? `${credits} credits` : formatMoney(amount, order.currency ?? 'EUR') ?? 'No total'}</Chip>
                {stringValue(order, 'trackingNumber', 'tracking_number') && <Chip variant="flat">Tracking</Chip>}
                {order.id && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <>
                    <Button size="sm" variant="flat" onPress={() => onUpdateOrder(order.id!, 'confirm-delivery')}>Confirm</Button>
                    <Button size="sm" color="danger" variant="flat" onPress={() => onUpdateOrder(order.id!, 'cancel')}>Cancel</Button>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

function OfferList({ offers, onUpdateOffer, canModerate = false }: { offers: MarketplaceOffer[]; onUpdateOffer: MarketplaceActionHandlers['updateOffer']; canModerate?: boolean }) {
  if (offers.length === 0) {
    return <EmptyState icon={<ClipboardCheck className="w-12 h-12" />} title="No offers" description="Marketplace offers will appear here." />;
  }

  return (
    <div className="space-y-3 mt-4">
      {offers.map((offer) => {
        const amount = numberValue(offer, 'amount');
        const credits = numberValue(offer, 'timeCreditAmount', 'time_credit_amount');
        return (
          <GlassCard key={offer.id} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-theme-primary">Listing #{numberValue(offer, 'marketplaceListingId', 'marketplace_listing_id') ?? '-'}</p>
                <p className="text-sm text-theme-muted line-clamp-1">{offer.message || 'No message'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip variant="flat">{offer.status ?? 'pending'}</Chip>
                <Chip color="success" variant="flat">{credits !== null ? `${credits} credits` : formatMoney(amount, offer.currency ?? 'EUR') ?? 'Open offer'}</Chip>
                {offer.id && (
                  <>
                    {canModerate ? (
                      <>
                        <Button size="sm" color="success" variant="flat" onPress={() => onUpdateOffer(offer.id!, 'accept')}>Accept</Button>
                        <Button size="sm" variant="flat" onPress={() => onUpdateOffer(offer.id!, 'counter')}>Counter</Button>
                        <Button size="sm" color="danger" variant="flat" onPress={() => onUpdateOffer(offer.id!, 'decline')}>Decline</Button>
                      </>
                    ) : (
                      <Button size="sm" color="danger" variant="flat" onPress={() => onUpdateOffer(offer.id!, 'delete')}>Withdraw</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

function CouponList({
  title,
  coupons,
  redemptions = {},
  editable = false,
  onDelete,
}: {
  title: string;
  coupons: MerchantCoupon[];
  redemptions?: Record<string, AnyRecord[]>;
  editable?: boolean;
  onDelete?: (id: number) => void;
}) {
  const { tenantPath } = useTenant();

  return (
    <WorkflowPanel title={title} icon={<BadgePercent className="w-5 h-5" />}>
      {coupons.length === 0 ? (
        <EmptyState icon={<BadgePercent className="w-12 h-12" />} title="No coupons" description="Coupons will appear here when available." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coupons.map((coupon) => (
            <GlassCard key={coupon.id ?? coupon.code} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-lg font-bold text-theme-primary">{coupon.code}</p>
                  <p className="text-sm text-theme-muted line-clamp-2">{coupon.description || 'Coupon'}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Chip size="sm" color="success" variant="flat">
                      {numberValue(coupon, 'discountAmount', 'discount_amount') ?? 0} {stringValue(coupon, 'discountType', 'discount_type') || 'fixed'}
                    </Chip>
                    <Chip size="sm" variant="flat">{boolValue(coupon, 'isActive', 'is_active') ? 'Active' : 'Inactive'}</Chip>
                    {dateValue(coupon, 'expiresAt', 'expires_at') && <Chip size="sm" variant="flat">Expires {dateValue(coupon, 'expiresAt', 'expires_at')}</Chip>}
                    {coupon.id && (
                      <Chip size="sm" variant="flat" startContent={<BarChart3 className="w-3 h-3" />}>
                        {(redemptions[String(coupon.id)] ?? []).length} redemptions
                      </Chip>
                    )}
                  </div>
                </div>
                {editable && coupon.id && (
                  <div className="flex gap-1">
                    <Link to={tenantPath(`/marketplace/seller/coupons/${coupon.id}/edit`)}>
                      <Button size="sm" variant="flat" isIconOnly aria-label="Edit coupon"><ExternalLink className="w-4 h-4" /></Button>
                    </Link>
                    <Button size="sm" color="danger" variant="flat" isIconOnly aria-label="Delete coupon" onPress={() => onDelete?.(coupon.id!)}>
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </WorkflowPanel>
  );
}

function PickupList({ title, slots }: { title: string; slots: PickupSlot[] }) {
  return (
    <WorkflowPanel title={title} icon={<CalendarClock className="w-5 h-5" />}>
      {slots.length === 0 ? (
        <EmptyState icon={<CalendarClock className="w-12 h-12" />} title="No pickup slots" description="Pickup slots will appear here." />
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <SmallRow
              key={slot.id}
              title={slot.location || 'Pickup slot'}
              detail={`${dateValue(slot, 'startsAt', 'starts_at')} · capacity ${slot.capacity ?? 1}`}
              status={boolValue(slot, 'isActive', 'is_active') ? 'Active' : 'Inactive'}
            />
          ))}
        </div>
      )}
    </WorkflowPanel>
  );
}

function ReservationList({ reservations }: { reservations: PickupReservation[] }) {
  return (
    <WorkflowPanel title="My pickup reservations" icon={<PackageCheck className="w-5 h-5" />}>
      {reservations.length === 0 ? (
        <EmptyState icon={<PackageCheck className="w-12 h-12" />} title="No pickup reservations" description="Reserved pickup windows will appear here." />
      ) : (
        <div className="space-y-2">
          {reservations.map((reservation) => (
            <SmallRow
              key={reservation.id}
              title={`Order #${numberValue(reservation, 'marketplaceOrderId', 'marketplace_order_id') ?? '-'}`}
              detail={`Slot #${numberValue(reservation, 'marketplacePickupSlotId', 'marketplace_pickup_slot_id') ?? '-'} | QR PX-${numberValue(reservation, 'marketplaceOrderId', 'marketplace_order_id') ?? '0'}-${reservation.id ?? '0'}`}
              status={reservation.status ?? 'reserved'}
            />
          ))}
        </div>
      )}
    </WorkflowPanel>
  );
}

export default MarketplaceParityPage;
