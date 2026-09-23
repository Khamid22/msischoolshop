import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, submitOrderDeliveryDetails } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import type { Order, OrderDeliveryRequirement } from '../types';
import './OrderDeliveryDetails.scss';

function initialAnswers(requirement: OrderDeliveryRequirement) {
  return Object.fromEntries(requirement.form.fields.map((field) => [field.id,
    requirement.answers[field.id] ?? (field.type === 'checkbox' ? false : ''),
  ]));
}

function DeliveryDetailsForm({ order, requirement, onSaved }: {
  order: Order;
  requirement: OrderDeliveryRequirement;
  onSaved: (order: Order) => void;
}) {
  const { t } = useLang();
  const formId = useId();
  const [answers, setAnswers] = useState<Record<string, string | boolean>>(() => initialAnswers(requirement));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const unchanged = requirement.form.fields.every((field) =>
    answers[field.id] === (requirement.answers[field.id] ?? (field.type === 'checkbox' ? false : '')));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      const updated = await submitOrderDeliveryDetails(order.id, requirement.itemIndex, answers, controller.signal);
      if (controller.signal.aborted) return;
      const saved = updated.deliveryRequirements?.find((item) => item.itemIndex === requirement.itemIndex);
      if (saved) setAnswers(initialAnswers(saved));
      onSaved(updated);
      window.dispatchEvent(new Event('msi:notifications'));
    } catch (failure) {
      if (controller.signal.aborted) return;
      const key = failure instanceof ApiError && failure.status === 401
        ? 'deliveryDetailsAuthExpired'
        : failure instanceof ApiError && failure.status === 409
          ? 'deliveryDetailsLocked'
          : failure instanceof ApiError && failure.status === 422 ? 'deliveryDetailsInvalid' : 'deliveryDetailsError';
      setError(t(key));
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  function change(fieldId: string, value: string | boolean) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
    setError('');
  }
  const item = order.items[requirement.itemIndex];
  const needsDetails = requirement.editable && requirement.missingRequiredFields.length > 0;
  return (
    <section className="order-delivery-details" aria-labelledby={`${formId}-title`}>
      <div>
        <h3 id={`${formId}-title`}>{t(needsDetails ? 'deliveryDetailsRequired' : 'deliveryInstructions')}</h3>
        <p>{item?.variant?.label || item?.product.name || t(item?.product.nameKey || '')} · {t('quantity')}: {item?.quantity || 1}</p>
      </div>
      {requirement.form.instructions ? <p className="order-delivery-details__instructions">{requirement.form.instructions}</p> : null}
      {requirement.form.links.map((link, index) => <a key={`${link.url}:${index}`} className="btn btn-secondary"
        href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}
      {requirement.submittedAt ? <p role="status">{t(requirement.editable ? 'deliveryDetailsSaved' : 'deliveryDetailsLocked')}</p> : null}
      {requirement.editable && requirement.form.fields.length > 0 ? (
        <form onSubmit={(event) => void save(event)}>
          {requirement.form.fields.map((field) => {
            const id = `${formId}-${field.id}`;
            return <div className="order-delivery-details__field" key={field.id}>
              {field.type === 'checkbox' ? <label className="order-delivery-details__checkbox">
                <input type="checkbox" checked={answers[field.id] === true} disabled={pending} required={field.required}
                  aria-describedby={field.help ? `${id}-help` : undefined} onChange={(event) => change(field.id, event.target.checked)} />
                <span>{field.label}{field.required ? ' *' : ''}</span>
              </label> : <>
                <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
                <input id={id} type={field.type === 'email' ? 'email' : 'text'} autoComplete="off"
                  inputMode={field.type === 'player_id' ? 'numeric' : undefined} maxLength={field.type === 'player_id' ? 20 : 1000}
                  pattern={field.type === 'player_id' ? '[1-9][0-9]{0,19}' : undefined} required={field.required}
                  value={String(answers[field.id] ?? '')} disabled={pending} onChange={(event) => change(field.id, event.target.value)}
                  aria-describedby={field.help ? `${id}-help` : undefined} />
              </>}
              {field.help ? <p id={`${id}-help`}>{field.help}</p> : null}
            </div>;
          })}
          <button type="submit" className="btn btn-primary" disabled={pending || (Boolean(requirement.submittedAt) && unchanged)}>
            {t(pending ? 'deliveryDetailsSaving' : requirement.submittedAt ? 'deliveryDetailsUpdate' : 'deliveryDetailsSubmit')}
          </button>
          {error ? <p role="alert" className="order-delivery-details__error">{error}</p> : null}
        </form>
      ) : requirement.form.fields.map((field) => <p key={field.id}><strong>{field.label}:</strong> {
        field.type === 'checkbox' ? t(requirement.answers[field.id] === true ? 'deliveryConfirmed' : 'deliveryNotConfirmed')
          : String(requirement.answers[field.id] || '—')
      }</p>)}
    </section>
  );
}

export default function OrderDeliveryDetails({ order, onSaved }: { order: Order; onSaved: (order: Order) => void }) {
  const { user } = useAuth();
  if (!user || order.userId !== user.id) return null;
  return <>{order.deliveryRequirements?.map((requirement) => (
    <DeliveryDetailsForm key={`${user.id}:${order.id}:${requirement.itemIndex}`} order={order}
      requirement={requirement} onSaved={onSaved} />
  ))}</>;
}
