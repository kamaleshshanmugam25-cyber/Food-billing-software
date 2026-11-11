/**
 * Formats a monetary number into Indian numbering / currency format or standard decimal.
 * e.g., 1250.5 -> ₹ 1,250.50
 */
export const formatCurrency = (amount, symbol = '₹') => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${symbol} 0.00`;
  }
  const num = Number(amount);
  return `${symbol} ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDateTime = (dateInput) => {
  if (!dateInput) return '';
  return `${formatDate(dateInput)} at ${formatTime(dateInput)}`;
};
