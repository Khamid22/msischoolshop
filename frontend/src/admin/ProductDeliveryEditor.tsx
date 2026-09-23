import type { DeliveryField, DeliveryForm } from '../types';

interface Props {
  value: DeliveryForm | null;
  onChange: (value: DeliveryForm | null) => void;
  disabled: boolean;
}

export function ProductDeliveryEditor({ value, onChange, disabled }: Props) {
  function updateField(index: number, changes: Partial<DeliveryField>) {
    if (value) onChange({ ...value, fields: value.fields.map((field, i) => i === index ? { ...field, ...changes } : field) });
  }

  return <fieldset className="delivery-form-editor field--wide" disabled={disabled}>
    <legend>Инструкции и данные после покупки</legend>
    <p>Ученик увидит ссылки и вопросы в своём заказе. Ответы появятся в истории заказов у сотрудников. Изменения применяются к следующим покупкам.</p>
    <label className="check-field">
      <input type="checkbox" checked={value !== null} onChange={(event) => onChange(event.target.checked ? { instructions: '', links: [], fields: [] } : null)} />
      <span>Настроить действия после покупки</span>
    </label>
    {value ? <>
      <label className="field"><span>Инструкция для ученика</span><textarea rows={3} maxLength={3000} value={value.instructions}
        onChange={(event) => onChange({ ...value, instructions: event.target.value })} placeholder="Что нужно сделать для получения товара" /></label>
      <div className="delivery-form-editor__heading"><strong>Ссылки после покупки</strong><button type="button" className="button button--small" disabled={value.links.length >= 5}
        onClick={() => onChange({ ...value, links: [...value.links, { label: '', url: '' }] })}>Добавить ссылку</button></div>
      {value.links.map((link, index) => <fieldset className="delivery-form-editor__row" key={index}>
        <legend>Ссылка {index + 1}</legend>
        <label className="field"><span>Текст кнопки</span><input required maxLength={100} value={link.label}
          onChange={(event) => onChange({ ...value, links: value.links.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} /></label>
        <label className="field"><span>Адрес ссылки</span><input type="url" required maxLength={2000} value={link.url} placeholder="https://…"
          onChange={(event) => onChange({ ...value, links: value.links.map((item, i) => i === index ? { ...item, url: event.target.value } : item) })} /></label>
        <button type="button" className="button button--small" onClick={() => onChange({ ...value, links: value.links.filter((_, i) => i !== index) })}>Удалить ссылку {index + 1}</button>
      </fieldset>)}
      <div className="delivery-form-editor__heading"><strong>Данные от ученика</strong><button type="button" className="button button--small" disabled={value.fields.length >= 10}
        onClick={() => onChange({ ...value, fields: [...value.fields, { id: `field-${crypto.randomUUID().slice(0, 12)}`, label: '', type: 'text', required: true, help: '' }] })}>Добавить поле</button></div>
      {value.fields.map((field, index) => <fieldset className="delivery-form-editor__row" key={field.id}>
        <legend>Поле {index + 1}</legend>
        <label className="field"><span>Название поля</span><input required maxLength={140} value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} placeholder="Например: ник в игре" /></label>
        <label className="field"><span>Тип ответа</span><select value={field.type} onChange={(event) => updateField(index, { type: event.target.value as DeliveryField['type'] })}>
          <option value="text">Текст / ник</option><option value="player_id">Числовой Player ID</option><option value="email">Email</option><option value="checkbox">Подтверждение галочкой</option>
        </select></label>
        <label className="field"><span>Подсказка ученику</span><input maxLength={500} value={field.help} onChange={(event) => updateField(index, { help: event.target.value })} /></label>
        <label className="check-field"><input type="checkbox" checked={field.required} onChange={(event) => updateField(index, { required: event.target.checked })} /><span>Обязательное поле</span></label>
        <button type="button" className="button button--small" onClick={() => onChange({ ...value, fields: value.fields.filter((_, i) => i !== index) })}>Удалить поле {index + 1}</button>
      </fieldset>)}
    </> : null}
  </fieldset>;
}
