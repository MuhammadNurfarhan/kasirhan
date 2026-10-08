import { create } from 'zustand';
import { Product, ProductVariant, CartItem, Customer } from '../types';
import { calculateLineSubtotal } from '../utils/format';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  tableNumber: string | null;
  note: string | null;
  discountPercent: number;
  discountAmount: number;

  // Actions
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  updateItemDiscount: (variantId: string, discountAmount: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setTableNumber: (tableNumber: string | null) => void;
  setTransactionDiscount: (percent: number, amount: number) => void;
  setNote: (note: string | null) => void;

  // Computed Getters
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTaxAmount: (taxRate: number, taxEnabled: boolean) => number;
  getTotal: (taxRate: number, taxEnabled: boolean) => number;
  getItemCount: () => number;
  restoreCartState: (data: Partial<CartState>) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  tableNumber: null,
  note: null,
  discountPercent: 0,
  discountAmount: 0,

  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => {
    const selectedVariant = variant || product.default_variant || product.variants?.[0];
    if (!selectedVariant) return;

    const isWeighted = product.is_weighted;
    // Default qty: 1000 grams for weighted (1 kg), or 1 pcs for regular
    const addQty = quantity !== undefined ? quantity : isWeighted ? 1000 : 1;

    set((state) => {
      const existingIndex = state.items.findIndex((item) => item.variantId === selectedVariant.id);

      if (existingIndex > -1) {
        const existing = state.items[existingIndex];
        const newQty = existing.quantity + addQty;
        const newSubtotal = calculateLineSubtotal(
          existing.sellPrice,
          newQty,
          existing.isWeighted,
          existing.discountAmount
        );

        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: newSubtotal,
        };
        return { items: updatedItems };
      }

      const initialSubtotal = calculateLineSubtotal(
        selectedVariant.sell_price,
        addQty,
        isWeighted,
        0
      );

      const newItem: CartItem = {
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantName: selectedVariant.name,
        unit: product.unit,
        isWeighted: product.is_weighted,
        trackStock: product.track_stock,
        availableStock: selectedVariant.stock,
        sellPrice: selectedVariant.sell_price,
        costPrice: selectedVariant.cost_price,
        quantity: addQty,
        discountAmount: 0,
        subtotal: initialSubtotal,
      };

      return { items: [...state.items, newItem] };
    });
  },

  updateQuantity: (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(variantId);
      return;
    }
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if (item.variantId === variantId) {
          const subtotal = calculateLineSubtotal(
            item.sellPrice,
            quantity,
            item.isWeighted,
            item.discountAmount
          );
          return { ...item, quantity, subtotal };
        }
        return item;
      });
      return { items: updatedItems };
    });
  },

  updateItemDiscount: (variantId: string, discountAmount: number) => {
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if (item.variantId === variantId) {
          const subtotal = calculateLineSubtotal(
            item.sellPrice,
            item.quantity,
            item.isWeighted,
            discountAmount
          );
          return { ...item, discountAmount, subtotal };
        }
        return item;
      });
      return { items: updatedItems };
    });
  },

  removeItem: (variantId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.variantId !== variantId),
    }));
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      tableNumber: null,
      note: null,
      discountPercent: 0,
      discountAmount: 0,
    });
  },

  setCustomer: (customer) => set({ customer }),
  setTableNumber: (tableNumber) => set({ tableNumber }),
  setTransactionDiscount: (percent, amount) => set({ discountPercent: percent, discountAmount: amount }),
  setNote: (note) => set({ note }),

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotalDiscount: () => {
    const state = get();
    const subtotal = state.getSubtotal();
    let txDiscount = state.discountAmount;
    if (state.discountPercent > 0) {
      txDiscount = Math.round((subtotal * state.discountPercent) / 100);
    }
    return txDiscount;
  },

  getTaxAmount: (taxRate: number, taxEnabled: boolean) => {
    if (!taxEnabled || taxRate <= 0) return 0;
    const state = get();
    const afterDiscount = Math.max(0, state.getSubtotal() - state.getTotalDiscount());
    return Math.round((afterDiscount * taxRate) / 100);
  },

  getTotal: (taxRate: number, taxEnabled: boolean) => {
    const state = get();
    const afterDiscount = Math.max(0, state.getSubtotal() - state.getTotalDiscount());
    const tax = state.getTaxAmount(taxRate, taxEnabled);
    return afterDiscount + tax;
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => {
      return count + (item.isWeighted ? 1 : item.quantity);
    }, 0);
  },

  restoreCartState: (data) => {
    set((state) => ({ ...state, ...data }));
  },
}));
