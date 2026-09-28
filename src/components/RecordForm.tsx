import React from 'react';
import { Record, ValidationError } from '../types/records';
import { Trash2 } from 'lucide-react';

interface RecordFormProps {
  record: Record;
  index: number;
  onChange: (record: Record) => void;
  onRemove: () => void;
  errors: ValidationError[];
}

export const RecordForm: React.FC<RecordFormProps> = ({ 
  record, 
  index, 
  onChange, 
  onRemove, 
  errors 
}) => {
  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleRecordChange = (field: keyof Omit<Record, 'id' | 'item'>, value: string) => {
    onChange({ ...record, [field]: value });
  };

  const handleItemChange = (field: keyof Record['item'], value: string | number | boolean) => {
    onChange({ 
      ...record, 
      item: { ...record.item, [field]: value }
    });
  };

  const prefix = `record_${index}`;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Zapis {index + 1}</h3>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-md transition-colors"
          title="Ukloni zapis"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Record Fields */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800 border-b pb-2">Detalji obaveze</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kod razloga *
            </label>
            <input
              type="text"
              value={record.reason_code}
              onChange={(e) => handleRecordChange('reason_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_reason_code`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_reason_code`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_reason_code`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spoljašnji ID (automatski numerisan ako je prazan)
            </label>
            <input
              type="text"
              value={record.external_id}
              onChange={(e) => handleRecordChange('external_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primalac *
            </label>
            <input
              type="text"
              value={record.recipient}
              onChange={(e) => handleRecordChange('recipient', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_recipient`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_recipient`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_recipient`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mesto primaoca *
            </label>
            <input
              type="text"
              value={record.recipient_place}
              onChange={(e) => handleRecordChange('recipient_place', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_recipient_place`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_recipient_place`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_recipient_place`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broj računa *
            </label>
            <input
              type="text"
              value={record.account_number}
              onChange={(e) => handleRecordChange('account_number', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_account_number`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_account_number`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_account_number`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broj fakture
            </label>
            <input
              type="text"
              value={record.invoice_number}
              onChange={(e) => handleRecordChange('invoice_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip fakture
            </label>
            <input
              type="text"
              value={record.invoice_type}
              onChange={(e) => handleRecordChange('invoice_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum fakture *
            </label>
            <input
              type="date"
              value={record.invoice_date}
              onChange={(e) => handleRecordChange('invoice_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_invoice_date`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_invoice_date`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_invoice_date`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum dospeća *
            </label>
            <input
              type="date"
              value={record.due_date}
              onChange={(e) => handleRecordChange('due_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_due_date`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_due_date`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_due_date`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broj ugovora
            </label>
            <input
              type="text"
              value={record.contract_number}
              onChange={(e) => handleRecordChange('contract_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kod plaćanja
            </label>
            <input
              type="text"
              value={record.payment_code}
              onChange={(e) => handleRecordChange('payment_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model kredita
            </label>
            <input
              type="text"
              value={record.credit_model}
              onChange={(e) => handleRecordChange('credit_model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referentni broj kredita
            </label>
            <input
              type="text"
              value={record.credit_reference_number}
              onChange={(e) => handleRecordChange('credit_reference_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Osnov plaćanja
            </label>
            <input
              type="text"
              value={record.payment_basis}
              onChange={(e) => handleRecordChange('payment_basis', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razred (ne izvozi se u XML)
            </label>
            <input
              type="text"
              value={record.class_group}
              onChange={(e) => handleRecordChange('class_group', e.target.value)}
              placeholder="npr. Razred 1, Grupa A..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beleške (ne izvozi se u XML)
            </label>
            <textarea
              value={record.notes}
              onChange={(e) => handleRecordChange('notes', e.target.value)}
              rows={2}
              placeholder="Unesite beleške ili napomene za ovaj zapis..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Item Fields */}
        <h4 className="text-md font-medium text-gray-800 border-b pb-2 mt-6">Detalji stavke</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID korisnika budžeta *
            </label>
            <input
              type="text"
              value={record.item.budget_user_id}
              onChange={(e) => handleItemChange('budget_user_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_budget_user_id`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_budget_user_id`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_budget_user_id`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kod programa *
            </label>
            <input
              type="text"
              value={record.item.program_code}
              onChange={(e) => handleItemChange('program_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_program_code`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_program_code`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_program_code`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kod projekta
            </label>
            <input
              type="text"
              value={record.item.project_code}
              onChange={(e) => handleItemChange('project_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kod ekonomske klasifikacije *
            </label>
            <input
              type="text"
              value={record.item.economic_classification_code}
              onChange={(e) => handleItemChange('economic_classification_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_economic_classification_code`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_economic_classification_code`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_economic_classification_code`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kod izvora finansiranja *
            </label>
            <input
              type="text"
              value={record.item.source_of_funding_code}
              onChange={(e) => handleItemChange('source_of_funding_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_source_of_funding_code`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_source_of_funding_code`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_source_of_funding_code`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kod funkcije *
            </label>
            <input
              type="text"
              value={record.item.function_code}
              onChange={(e) => handleItemChange('function_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_function_code`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_function_code`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_function_code`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Iznos *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={record.item.amount}
              onChange={(e) => handleItemChange('amount', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_amount`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_amount`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_amount`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Račun evidentiranja *
            </label>
            <input
              type="text"
              value={record.item.recording_account}
              onChange={(e) => handleItemChange('recording_account', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_recording_account`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_recording_account`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_recording_account`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Očekivani datum plaćanja *
            </label>
            <input
              type="date"
              value={record.item.expected_payment_date}
              onChange={(e) => handleItemChange('expected_payment_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getError(`${prefix}_item_expected_payment_date`) ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {getError(`${prefix}_item_expected_payment_date`) && (
              <p className="text-red-500 text-xs mt-1">{getError(`${prefix}_item_expected_payment_date`)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Račun knjiženja
            </label>
            <input
              type="text"
              value={record.item.posting_account}
              onChange={(e) => handleItemChange('posting_account', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </div>
      </div>
    </div>
  );
};