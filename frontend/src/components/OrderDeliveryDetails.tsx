import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, submitOrderDeliveryDetails } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import type { Order, OrderDeliveryRequirement } from '../types';
import './OrderDeliveryDetails.scss';

function PlayerIdForm({ order, requirement, onSaved }: {
  order: Order;
  requirement: OrderDeliveryRequirement;
  onSaved: (order: Order) => void;
}) {
  const { t } = useLang();
  const inputId = useId();
  const [playerId, setPlayerId] = useState(requirement.playerId || '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const value = playerId.trim();
    if (!/^[1-9][0-9]{0,19}$/.test(value)) {
      setError(t('robloxPlayerIdInvalid'));
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      const updated = await submitOrderDeliveryDetails(order.id, requirement.itemIndex, value, controller.signal);
      if (controller.signal.aborted) return;
      setPlayerId(value);
      onSaved(updated);
      window.dispatchEvent(new Event('msi:notifications'));
    } catch (failure) {
      if (controller.signal.aborted) return;
      const key = failure instanceof ApiError && failure.status === 401
        ? 'deliveryDetailsAuthExpired'
        : failure instanceof ApiError && failure.status === 409
          ? 'deliveryDetailsLocked'
          : 'deliveryDetailsError';
      setError(t(key));
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  const item = order.items[requirement.itemIndex];
  return (
    <section className="order-delivery-details" aria-labelledby={`${inputId}-title`}>
      <div>
        <h3 id={`${inputId}-title`}>{t(requirement.playerId ? 'deliveryDetailsSaved' : 'deliveryDetailsRequired')}</h3>
        <p>{item?.variant?.label || item?.product.name || 'Robux'} · {t('quantity')}: {item?.quantity || 1}</p>
      </div>
      {requirement.playerId && <p role="status">{t(requirement.editable ? 'deliveryDetailsAwaitingDelivery' : 'deliveryDetailsLocked')}</p>}
      {requirement.editable ? (
        <form onSubmit={(event) => void save(event)}>
          <label htmlFor={inputId}>{t('robloxPlayerId')}</label>
          <input id={inputId} type="text" inputMode="numeric" autoComplete="off" maxLength={20}
            value={playerId} onChange={(event) => { setPlayerId(event.target.value); setError(''); }}
            disabled={pending} required pattern="[1-9][0-9]{0,19}" aria-describedby={`${inputId}-help`}
            aria-invalid={Boolean(error)} />
          <p id={`${inputId}-help`}>{t('robloxPlayerIdHelp')}</p>
          <button type="submit" className="btn btn-primary" disabled={pending || playerId.trim() === requirement.playerId}>
            {t(pending ? 'deliveryDetailsSaving' : requirement.playerId ? 'deliveryDetailsUpdate' : 'deliveryDetailsSubmit')}
          </button>
          {error && <p role="alert" className="order-delivery-details__error">{error}</p>}
        </form>
      ) : <p><strong>{t('robloxPlayerId')}: {requirement.playerId || '—'}</strong></p>}
    </section>
  );
}

export default function OrderDeliveryDetails({ order, onSaved }: { order: Order; onSaved: (order: Order) => void }) {
  const { user } = useAuth();
  if (!user || order.userId !== user.id) return null;
  return <>{order.deliveryRequirements?.map((requirement) => (
    <PlayerIdForm key={`${user.id}:${order.id}:${requirement.itemIndex}`} order={order}
      requirement={requirement} onSaved={onSaved} />
  ))}</>;
}
