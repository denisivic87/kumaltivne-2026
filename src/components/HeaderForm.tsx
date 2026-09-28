import React from 'react';
import { Header, ValidationError } from '../types/records';

interface HeaderFormProps {
  header: Header;
  onChange: (header: Header) => void;
  errors: ValidationError[];
}

export const HeaderForm: React.FC<HeaderFormProps> = ({ header, onChange, errors }) => {
  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleChange = (field: keyof Header, value: string) => {
    onChange({ ...header, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Informacije zaglavlja</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kumulativni kod razloga
          </label>
          <input
            type="text"
            value={header.cumulative_reason_code}
            onChange={(e) => handleChange('cumulative_reason_code', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getError('cumulative_reason_code') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="npr. PO07"
          />
          {getError('cumulative_reason_code') && (
            <p className="text-red-500 text-xs mt-1">{getError('cumulative_reason_code')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budžetska godina
          </label>
          <input
            type="text"
            value={header.budget_year}
            onChange={(e) => handleChange('budget_year', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getError('budget_year') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="npr. 2025"
          />
          {getError('budget_year') && (
            <p className="text-red-500 text-xs mt-1">{getError('budget_year')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID korisnika budžeta
          </label>
          <input
            type="text"
            value={header.budget_user_id}
            onChange={(e) => handleChange('budget_user_id', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getError('budget_user_id') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="ID korisnika budžeta"
          />
          {getError('budget_user_id') && (
            <p className="text-red-500 text-xs mt-1">{getError('budget_user_id')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kod valute
          </label>
          <input
            type="text"
            value={header.currency_code}
            onChange={(e) => handleChange('currency_code', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getError('currency_code') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="npr. RSD"
          />
          {getError('currency_code') && (
            <p className="text-red-500 text-xs mt-1">{getError('currency_code')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trezor
          </label>
          <input
            type="text"
            value={header.treasury}
            onChange={(e) => handleChange('treasury', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getError('treasury') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Kod trezora"
          />
          {getError('treasury') && (
            <p className="text-red-500 text-xs mt-1">{getError('treasury')}</p>
          )}
        </div>
      </div>
    </div>
  );
};