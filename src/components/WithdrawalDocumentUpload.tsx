import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { WithdrawalDocument } from '../types';

interface WithdrawalDocumentUploadProps {
  documents: WithdrawalDocument[];
  onChange: (docs: WithdrawalDocument[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
}

export const WithdrawalDocumentUpload: React.FC<WithdrawalDocumentUploadProps> = ({
  documents,
  onChange,
  maxFiles = 5,
  maxSizeMb = 10
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<WithdrawalDocument['category']>('bank_proof');
  const [uploadError, setUploadError] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<WithdrawalDocument | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileProcess = (file: File) => {
    setUploadError('');

    if (documents.length >= maxFiles) {
      setUploadError(`Maximum ${maxFiles} documents allowed.`);
      return;
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File "${file.name}" exceeds the ${maxSizeMb}MB size limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newDoc: WithdrawalDocument = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: file.name,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        url: dataUrl,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        category: selectedCategory
      };

      onChange([...documents, newDoc]);
    };

    reader.onerror = () => {
      setUploadError(`Failed to read file "${file.name}". Please try another file.`);
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      handleFileProcess(files[i]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      handleFileProcess(files[i]);
    }
  };

  const handleRemove = (docId: string) => {
    onChange(documents.filter(d => d.id !== docId));
  };

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'bank_proof':
        return 'Bank Account Proof / Passbook';
      case 'cancelled_cheque':
        return 'Cancelled Cheque';
      case 'account_statement':
        return 'Bank Statement';
      case 'other':
        return 'Other Verification Doc';
      default:
        return 'Account Proof';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[#8A8A8A]">
          Bank Proof / Account Documents <span className="text-[#00C853] font-normal">(Recommended)</span>
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-[#777]">Document Type:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] text-white text-[11px] rounded-lg px-2 py-1 outline-none focus:border-[#00C853]"
          >
            <option value="bank_proof">Passbook / Front Page</option>
            <option value="cancelled_cheque">Cancelled Cheque</option>
            <option value="account_statement">Bank Statement (PDF / Image)</option>
            <option value="other">Other Identity Document</option>
          </select>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-[#00C853] bg-[#00C853]/5' 
            : 'border-[#2A2A2A] bg-[#141414] hover:border-[#3A3A3A] hover:bg-[#181818]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853]">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-white">
            Click or drag & drop bank documents here
          </p>
          <p className="text-[11px] text-[#8A8A8A]">
            Supports Bank Passbook, Cheque, Statement (JPG, PNG, PDF up to {maxSizeMb}MB)
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-[#8A8A8A]">
            <span>Attached Documents ({documents.length}/{maxFiles})</span>
            <span className="text-[#00C853] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Ready for verification
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {documents.map((doc) => {
              const isPdf = doc.type.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
              return (
                <div
                  key={doc.id}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-[#3A3A3A] transition-all"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#222] border border-[#333] flex items-center justify-center shrink-0 overflow-hidden">
                      {isPdf ? (
                        <FileText className="w-5 h-5 text-red-400" />
                      ) : (
                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{doc.name}</p>
                      <p className="text-[10px] text-[#8A8A8A] truncate">{getCategoryLabel(doc.category)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDoc(doc);
                      }}
                      className="p-1.5 text-[#8A8A8A] hover:text-[#00C853] hover:bg-[#252525] rounded-lg transition-all"
                      title="Preview Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(doc.id);
                      }}
                      className="p-1.5 text-[#8A8A8A] hover:text-red-400 hover:bg-[#252525] rounded-lg transition-all"
                      title="Remove Document"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-[#141414] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#222] pb-2">
              <div>
                <h4 className="text-sm font-bold text-white">{previewDoc.name}</h4>
                <p className="text-xs text-[#8A8A8A]">{getCategoryLabel(previewDoc.category)}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-[#8A8A8A] hover:text-white p-1 rounded-lg hover:bg-[#222]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-[#0D0D0D] rounded-xl p-2 border border-[#222]">
              {previewDoc.type.includes('pdf') || previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[50vh] rounded-lg border-0"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[55vh] max-w-full object-contain rounded-lg shadow"
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white text-xs font-semibold rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
