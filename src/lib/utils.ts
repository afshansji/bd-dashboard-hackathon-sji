import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "Never";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    return "Never";
  }
}

export function roundToDecimals(value?: number | null, decimals = 2): number {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

export function formatDecimal(value?: number | null, decimals = 2): string {
  const rounded = roundToDecimals(value, decimals);
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }
  return rounded.toFixed(decimals);
}

export function formatCurrency(value: number): string {
  const amount = roundToDecimals(value, 2);
  const hasFraction = !Number.isInteger(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

export function getClientName(client: unknown, clients?: unknown, clientCompanyName?: unknown): string {
  if (clients && typeof clients === "object" && "name" in clients) {
    const maybeName = (clients as { name?: string | null }).name;
    if (typeof maybeName === "string" && maybeName.trim().length > 0) {
      return maybeName;
    }
  }

  if (client && typeof client === "object" && "name" in client) {
    const maybeName = (client as { name?: string | null }).name;
    if (typeof maybeName === "string" && maybeName.trim().length > 0) {
      return maybeName;
    }
  }

  if (typeof clientCompanyName === "string") {
    const trimmed = clientCompanyName.trim();
    if (trimmed && trimmed.toLowerCase() !== "unknown client") {
      return trimmed;
    }
  }

  if (typeof client === "string") {
    const trimmed = client.trim();
    if (trimmed && trimmed.toLowerCase() !== "unknown client") {
      return trimmed;
    }
  }

  return "Unknown";
}

export function getBestClientName(deal: any): string {
  if (deal.client && typeof deal.client === 'object' && deal.client.name) {
    const name = deal.client.name.trim();
    if (name && name.toLowerCase() !== 'unknown client') {
      return name;
    }
  }

  if (deal.clients && typeof deal.clients === 'object' && deal.clients.name) {
    const name = deal.clients.name.trim();
    if (name && name.toLowerCase() !== 'unknown client') {
      return name;
    }
  }

  if (deal.clientCompanyName && typeof deal.clientCompanyName === 'string') {
    const name = deal.clientCompanyName.trim();
    if (name && name.toLowerCase() !== 'unknown client') {
      return name;
    }
  }

  if (typeof deal.client === 'string') {
    const trimmed = deal.client.trim();
    if (trimmed && trimmed.toLowerCase() !== 'unknown client') {
      return trimmed;
    }
  }

  return "Unknown";
}

export function getBestOwnerName(deal: any): string {
  if (deal.actual_deal_owner_name && typeof deal.actual_deal_owner_name === 'string') {
    const name = deal.actual_deal_owner_name.trim();
    if (name && name.toLowerCase() !== 'unassigned') {
      return name;
    }
  }

  if (deal.actual_deal_owner_email && typeof deal.actual_deal_owner_email === 'string') {
    const email = deal.actual_deal_owner_email.trim();
    if (email.includes('@')) {
      return email.split('@')[0].replace(/[._]/g, ' ');
    }
  }

  if (deal.owner && typeof deal.owner === 'string') {
    const owner = deal.owner.trim();
    if (owner.includes('@')) {
      return owner.split('@')[0].replace(/[._]/g, ' ');
    }
    if (owner.toLowerCase() === 'unassigned') {
      return "Unassigned";
    }
  }

  return "Unassigned";
}
