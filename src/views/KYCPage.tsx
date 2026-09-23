import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  ArrowRight,
  Camera,
  X,
  RefreshCw,
  RotateCcw,
  Loader2,
  Check,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { KYCSubmission, DocumentUploadState, UploadedDocumentRecord } from '../types';
import { processDocumentFile, uploadDocumentToServer, validateDocumentFile } from '../utils/documentUpload';
import { KYCConfirmationModal } from '../components/KYCConfirmationModal';
import { feedbackService } from '../services/feedbackService';

export const KYCPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  const [kycData, setKycData] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState(user?.name || '');
  const [documentType, setDocumentType] = useState<'passport' | 'id_card' | 'driver_license' | 'aadhaar' | 'pan_card'>('id_card');
  const [documentNumber, setDocumentNumber] = useState('');

  // Robust Document Upload State Machine
  const [frontDoc, setFrontDoc] = useState<{
    file?: File;
    previewUrl?: string;
    record?: UploadedDocumentRecord;
    state: DocumentUploadState;
    progress: number;
    error?: string;
  }>({
    state: 'IDLE',
    progress: 0
  });

  const [backDoc, setBackDoc] = useState<{
    file?: File;
    previewUrl?: string;
    record?: UploadedDocumentRecord;
    state: DocumentUploadState;
    progress: number;
    error?: string;
  }>({
    state: 'IDLE',
    progress: 0
  });

  // Camera State
  const [activeCameraTarget, setActiveCameraTarget] = useState<'front' | 'back' | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [cameraInitializing, setCameraInitializing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadKYCStatus();
    return () => {
      stopCameraStream();
    };
  }, []);

  const loadKYCStatus = async () => {
    try {
      setLoading(true);
      const res = await apiService.getKYCStatus();
      if (res && res.kyc) {
        setKycData(res.kyc);
        if (res.kyc.fullName) setFullName(res.kyc.fullName);
        if (res.kyc.documentType) setDocumentType(res.kyc.documentType);
        if (res.kyc.documentNumber) setDocumentNumber(res.kyc.documentNumber);

        // Prepopulate uploaded records if existing
        if (res.kyc.idFront) {
          setFrontDoc({
            state: 'UPLOADED',
            previewUrl: res.kyc.idFront,
            progress: 100,
            record: {
              documentId: res.kyc.idFrontDocId || 'doc_front_existing',
              target: 'id_front',
              fileName: 'Front_ID_Document',
              fileSize: 0,
              mimeType: 'image/jpeg',
              storageReference: res.kyc.idFront,
              url: res.kyc.idFront,
              status: 'UPLOADED',
              uploadedAt: res.kyc.submittedAt || new Date().toISOString()
            }
          });
        }
        if (res.kyc.idBack) {
          setBackDoc({
            state: 'UPLOADED',
            previewUrl: res.kyc.idBack,
            progress: 100,
            record: {
              documentId: res.kyc.idBackDocId || 'doc_back_existing',
              target: 'id_back',
              fileName: 'Back_ID_Document',
              fileSize: 0,
              mimeType: 'image/jpeg',
              storageReference: res.kyc.idBack,
              url: res.kyc.idBack,
              status: 'UPLOADED',
              uploadedAt: res.kyc.submittedAt || new Date().toISOString()
            }
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startCamera = async (target: 'front' | 'back', mode: 'environment' | 'user' = 'environment') => {
    stopCameraStream();
    setActiveCameraTarget(target);
    setFacingMode(mode);
    setCameraError('');
    setCameraInitializing(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(err.message || 'Unable to access camera. Please check camera permissions in your browser or select a document file from gallery.');
    } finally {
      setCameraInitializing(false);
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setActiveCameraTarget(null);
  };

  const executeUpload = async (
    target: 'front' | 'back',
    file: File | null,
    directDataUrl?: string,
    fileNameOverride?: string
  ) => {
    const isFront = target === 'front';
    const setter = isFront ? setFrontDoc : setBackDoc;

    try {
      setter(prev => ({
        ...prev,
        state: 'VALIDATING',
        progress: 10,
        error: undefined
      }));

      let dataUrl = directDataUrl || '';
      let mimeType = 'image/jpeg';
      let fileSize = file?.size || 0;
      let fileName = fileNameOverride || file?.name || `${target}_document.jpg`;

      if (!dataUrl && file) {
        const validation = validateDocumentFile(file);
        if (!validation.valid) {
          setter(prev => ({
            ...prev,
            state: 'FAILED',
            progress: 0,
            error: validation.error
          }));
          return;
        }

        setter(prev => ({
          ...prev,
          state: 'UPLOADING',
          progress: 25,
          file
        }));

        const processed = await processDocumentFile(file, (_, pct) => {
          setter(prev => ({ ...prev, progress: Math.min(60, pct) }));
        });

        dataUrl = processed.dataUrl;
        mimeType = processed.mimeType;
        fileSize = processed.size;

        setter(prev => ({
          ...prev,
          previewUrl: processed.previewUrl,
          progress: 60
        }));
      } else {
        setter(prev => ({
          ...prev,
          state: 'UPLOADING',
          previewUrl: dataUrl,
          progress: 50
        }));
      }

      // Perform direct server upload
      const record = await uploadDocumentToServer({
        target: isFront ? 'id_front' : 'id_back',
        fileDataUrl: dataUrl,
        fileName,
        fileType: mimeType,
        fileSize,
        sessionOrUserId: user?.id,
        onProgress: (pct) => {
          setter(prev => ({ ...prev, progress: Math.max(60, pct) }));
        }
      });

      setter({
        state: 'UPLOADED',
        progress: 100,
        file: file || undefined,
        previewUrl: dataUrl || record.url,
        record,
        error: undefined
      });
      setErrorMsg('');
    } catch (err: any) {
      setter(prev => ({
        ...prev,
        state: 'FAILED',
        progress: 0,
        error: err.message || 'Failed to upload document. Please check your connection and retry.'
      }));
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !activeCameraTarget) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapshotUrl = canvas.toDataURL('image/jpeg', 0.85);
      const target = activeCameraTarget;
      closeCameraModal();

      await executeUpload(target, null, snapshotUrl, `camera_${target}_id.jpg`);
    }
  };

  const toggleCameraFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    if (activeCameraTarget) {
      startCamera(activeCameraTarget, nextMode);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      executeUpload(target, file);
    }
    e.target.value = '';
  };

  const requiresBack = ['id_card', 'driver_license', 'aadhaar'].includes(documentType);
  const isFrontReady = frontDoc.state === 'UPLOADED' && !!frontDoc.record?.url;
  const isBackReady = !requiresBack || (backDoc.state === 'UPLOADED' && !!backDoc.record?.url);
  const isAnyUploading = frontDoc.state === 'UPLOADING' || frontDoc.state === 'VALIDATING' || backDoc.state === 'UPLOADING' || backDoc.state === 'VALIDATING';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isAnyUploading) {
      setErrorMsg('Documents are currently uploading. Please wait for upload confirmation.');
      return;
    }

    const cleanFullName = fullName.trim();
    if (!cleanFullName || cleanFullName.length < 2) {
      setErrorMsg('Please enter your full legal name as shown on your identification document.');
      return;
    }

    const rawDocNum = documentNumber.trim();
    if (!rawDocNum) {
      setErrorMsg('Please enter your document identification number.');
      return;
    }

    // Dynamic document format checks
    if (documentType === 'aadhaar') {
      const sanitizedAadhaar = rawDocNum.replace(/[\s-]/g, '');
      if (!/^\d{12}$/.test(sanitizedAadhaar)) {
        setErrorMsg('Please enter a valid 12-digit Aadhaar number (e.g. 1234 5678 9012).');
        return;
      }
    } else if (documentType === 'pan_card') {
      const sanitizedPan = rawDocNum.toUpperCase().replace(/\s/g, '');
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(sanitizedPan)) {
        setErrorMsg('Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).');
        return;
      }
    } else if (documentType === 'passport') {
      const sanitizedPassport = rawDocNum.replace(/\s/g, '');
      if (sanitizedPassport.length < 6 || sanitizedPassport.length > 15) {
        setErrorMsg('Passport number should be between 6 and 15 alphanumeric characters.');
        return;
      }
    } else if (documentType === 'driver_license') {
      const sanitizedDL = rawDocNum.replace(/\s/g, '');
      if (sanitizedDL.length < 5 || sanitizedDL.length > 25) {
        setErrorMsg('Please enter a valid driving license number (at least 5 characters).');
        return;
      }
    } else {
      if (rawDocNum.length < 4 || rawDocNum.length > 30) {
        setErrorMsg('Please enter a valid document identification number (at least 4 characters).');
        return;
      }
    }

    if (!isFrontReady) {
      setErrorMsg('Please upload and verify the Front photo of your ID document.');
      return;
    }

    if (requiresBack && !isBackReady) {
      setErrorMsg('Please upload and verify the Back photo of your ID document.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const uploadedDocs: UploadedDocumentRecord[] = [];
      if (frontDoc.record) uploadedDocs.push(frontDoc.record);
      if (backDoc.record && requiresBack) uploadedDocs.push(backDoc.record);

      const res = await apiService.submitKYC({
        fullName: cleanFullName,
        documentType,
        documentNumber: documentType === 'aadhaar' ? rawDocNum.replace(/[\s-]/g, '') : (documentType === 'pan_card' ? rawDocNum.toUpperCase() : rawDocNum),
        idFront: frontDoc.record?.url || frontDoc.previewUrl,
        idBack: requiresBack ? (backDoc.record?.url || backDoc.previewUrl) : (backDoc.record?.url || frontDoc.record?.url || frontDoc.previewUrl),
        idFrontDocId: frontDoc.record?.documentId,
        idBackDocId: backDoc.record?.documentId,
        documents: uploadedDocs
      });

      setSuccessMsg(res.message || 'Real Name Authentication documents submitted successfully!');
      setKycData(res.kyc);
      setShowSuccessModal(true);

      // Trigger pleasant success chime & haptic vibration on mobile devices
      feedbackService.playSuccessChime();
      feedbackService.triggerVibration('success');

      if (refreshUser) refreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit authentication request. Please try again.');
      setShowSuccessModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-8 font-mono text-xs text-[#8A8A8A]">
        <Loader2 className="w-5 h-5 animate-spin text-[#00C853] mr-2" />
        Loading Real Name Authentication details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Title & Banner */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-[#00C853]" />
            <h1 className="text-2xl font-extrabold text-white">Real Name Authentication</h1>
          </div>
          <p className="text-xs text-[#8A8A8A] mt-1">
            Verify your identity with encrypted server-side document validation to activate instant deposits and unrestricted withdrawals.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {user?.kycStatus === 'verified' ? (
            <span className="px-3 py-1.5 rounded-xl bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30 font-extrabold text-xs flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>VERIFIED PROFILE</span>
            </span>
          ) : kycData?.status === 'pending' || user?.kycStatus === 'pending' ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 font-extrabold text-xs flex items-center space-x-1.5">
              <Clock className="w-4 h-4 animate-spin" />
              <span>AUTHENTICATION PENDING</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30 font-extrabold text-xs flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>UNVERIFIED</span>
            </span>
          )}
        </div>
      </div>

      {/* STATUS BANNER */}
      {user?.kycStatus === 'verified' && (
        <div className="bg-[#121212] border border-[#00C853]/30 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853] mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-white">Account Verified</h2>
          <p className="text-xs text-[#8A8A8A] max-w-md mx-auto">
            Your identity has been fully verified. You enjoy full access to institutional liquidity, live spreads, and zero-fee withdrawals.
          </p>
          <div className="pt-2 text-xs font-mono text-[#8A8A8A] flex items-center justify-center space-x-4">
            <div><span className="text-[#555]">Legal Name:</span> {kycData?.fullName || user.name}</div>
            <div><span className="text-[#555]">Status:</span> <span className="text-[#00C853] font-bold">APPROVED</span></div>
          </div>
        </div>
      )}

      {kycData?.status === 'pending' && user?.kycStatus !== 'verified' && (
        <div className="bg-[#121212] border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Clock className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="text-lg font-extrabold text-white">Verification Under Review</h2>
          <p className="text-xs text-[#8A8A8A] max-w-md mx-auto">
            Your submitted documents are currently being processed by the Compliance Team. Review typically takes 15–20 minutes.
          </p>
          <div className="pt-2 text-xs font-mono text-white flex items-center justify-center space-x-6">
            <div><span className="text-[#8A8A8A]">Document Type:</span> {kycData.documentType?.replace('_', ' ').toUpperCase()}</div>
            <div><span className="text-[#8A8A8A]">Document #:</span> {kycData.documentNumber}</div>
          </div>
        </div>
      )}

      {/* FORM CONTAINER */}
      {(user?.kycStatus !== 'verified' && kycData?.status !== 'pending') && (
        <form onSubmit={handleSubmit} className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-6">
          <div className="border-b border-[#222222] pb-4">
            <h2 className="text-lg font-extrabold text-white">Submit Identity Documents</h2>
            <p className="text-xs text-[#8A8A8A] mt-1">
              Please provide clear, unedited photographs of your government-issued identity documents.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl text-[#FF3B30] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-[#00C853]/10 border border-[#00C853]/30 rounded-xl text-[#00C853] text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Personal & Document Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Identification Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1.5">FULL LEGAL NAME</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As printed on your official ID"
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#00C853] rounded-xl px-3.5 py-3 text-xs text-white placeholder-[#555] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1.5">DOCUMENT TYPE</label>
                <select
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value as any);
                    setErrorMsg('');
                  }}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#00C853] rounded-xl px-3 py-3 text-xs text-white outline-none transition-colors cursor-pointer"
                >
                  <option value="id_card">National ID Card / Government ID (Front + Back)</option>
                  <option value="aadhaar">Aadhaar Card (India UIDAI - Front + Back)</option>
                  <option value="pan_card">PAN Card (India Income Tax Dept - Front)</option>
                  <option value="passport">International Passport (Front Page)</option>
                  <option value="driver_license">Driver's License (Front + Back)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8A8A8A] mb-1.5">
                DOCUMENT IDENTIFICATION NUMBER
                {documentType === 'aadhaar' && <span className="text-gray-400 font-normal ml-1">(12-Digit UID)</span>}
                {documentType === 'pan_card' && <span className="text-gray-400 font-normal ml-1">(10-Char PAN)</span>}
              </label>
              <input
                type="text"
                required
                inputMode={documentType === 'aadhaar' ? 'numeric' : 'text'}
                value={documentNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  if (documentType === 'pan_card') {
                    setDocumentNumber(val.toUpperCase());
                  } else {
                    setDocumentNumber(val);
                  }
                }}
                placeholder={
                  documentType === 'aadhaar'
                    ? 'e.g. 1234 5678 9012'
                    : documentType === 'pan_card'
                    ? 'e.g. ABCDE1234F'
                    : documentType === 'passport'
                    ? 'e.g. A12345678'
                    : documentType === 'driver_license'
                    ? 'e.g. DL-1420110012345'
                    : 'Enter document ID number'
                }
                className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#00C853] rounded-xl px-3.5 py-3 text-xs font-mono text-white placeholder-[#555] outline-none transition-colors"
              />
              <p className="text-[11px] text-[#8A8A8A] mt-1">
                {documentType === 'aadhaar'
                  ? 'Enter your 12-digit numeric Aadhaar number (spaces/hyphens permitted).'
                  : documentType === 'pan_card'
                  ? 'Enter your 10-character alphanumeric PAN ID (5 letters, 4 numbers, 1 letter).'
                  : documentType === 'passport'
                  ? 'Enter your official alphanumeric passport number.'
                  : documentType === 'driver_license'
                  ? 'Enter your state-issued driving license identification.'
                  : 'Enter your government or national ID document number.'}
              </p>
            </div>
          </div>

          {/* Section 2: Upload Documents with State Machine */}
          <div className="space-y-4 pt-4 border-t border-[#222222]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Document Uploads</h3>
              <span className="text-[10px] text-[#8A8A8A]">Supports JPG, PNG, WEBP, HEIC, or PDF (Max 15MB)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ID Front Document Card */}
              <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#8A8A8A]">
                    ID FRONT PHOTO <span className="text-[#FF3B30]">*</span>
                  </label>
                  {frontDoc.state === 'UPLOADED' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#00C853]/15 text-[#00C853] text-[10px] font-bold flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Verified Upload</span>
                    </span>
                  )}
                  {(frontDoc.state === 'UPLOADING' || frontDoc.state === 'VALIDATING') && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center space-x-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Uploading {frontDoc.progress}%</span>
                    </span>
                  )}
                  {frontDoc.state === 'FAILED' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FF3B30]/15 text-[#FF3B30] text-[10px] font-bold flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Upload Failed</span>
                    </span>
                  )}
                </div>

                {frontDoc.state === 'UPLOADED' && frontDoc.previewUrl ? (
                  <div className="relative group rounded-lg overflow-hidden border border-[#333] bg-[#121212]">
                    {frontDoc.previewUrl.startsWith('data:application/pdf') || frontDoc.previewUrl.endsWith('.pdf') ? (
                      <div className="h-32 w-full flex flex-col items-center justify-center p-3 text-center">
                        <FileCheck className="w-8 h-8 text-[#00C853] mb-1" />
                        <span className="text-xs font-bold text-white">PDF Document Verified</span>
                        <span className="text-[10px] text-[#8A8A8A]">Front ID</span>
                      </div>
                    ) : (
                      <img src={frontDoc.previewUrl} alt="ID Front" className="h-32 w-full object-cover" />
                    )}
                    <div className="p-2 bg-[#161616] flex items-center justify-between border-t border-[#222]">
                      <span className="text-[10px] text-[#8A8A8A] truncate max-w-[140px]">
                        {frontDoc.record?.fileName || 'Front ID Photo'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFrontDoc({ state: 'IDLE', progress: 0 })}
                        className="bg-[#222] hover:bg-[#333] text-white text-[10px] px-2.5 py-1 rounded-md font-bold transition-colors"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-[#333] hover:border-[#00C853]/60 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 transition-colors min-h-[140px] relative">
                    {(frontDoc.state === 'UPLOADING' || frontDoc.state === 'VALIDATING') ? (
                      <div className="flex flex-col items-center justify-center space-y-2 py-4 w-full">
                        <Loader2 className="w-6 h-6 animate-spin text-[#00C853]" />
                        <span className="text-xs font-bold text-white">Uploading & Verifying Front Document...</span>
                        <div className="w-full max-w-[200px] bg-[#222] rounded-full h-1.5 overflow-hidden mt-1">
                          <div
                            className="bg-[#00C853] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${frontDoc.progress}%` }}
                          />
                        </div>
                      </div>
                    ) : frontDoc.state === 'FAILED' ? (
                      <div className="flex flex-col items-center justify-center space-y-2 text-center py-2">
                        <AlertCircle className="w-6 h-6 text-[#FF3B30]" />
                        <span className="text-xs font-bold text-[#FF3B30]">{frontDoc.error || 'Upload failed'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (frontDoc.file) {
                              executeUpload('front', frontDoc.file);
                            } else {
                              setFrontDoc({ state: 'IDLE', progress: 0 });
                            }
                          }}
                          className="px-3 py-1.5 bg-[#FF3B30]/20 hover:bg-[#FF3B30]/30 text-[#FF3B30] font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors mt-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Upload</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => startCamera('front', 'environment')}
                            className="px-3 py-2 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-colors"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Use Camera</span>
                          </button>
                          
                          <label className="cursor-pointer px-3 py-2 bg-[#222] hover:bg-[#333] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 border border-[#333] transition-colors">
                            <Upload className="w-4 h-4 text-[#8A8A8A]" />
                            <span>Gallery / File</span>
                            <input 
                              type="file" 
                              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*,application/pdf,.pdf" 
                              onChange={(e) => handleFileUpload(e, 'front')} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                        <span className="text-[10px] text-[#8A8A8A]">Snap photo directly or select from device</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ID Back Document Card (if required) */}
              {requiresBack && (
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#8A8A8A]">
                      ID BACK PHOTO <span className="text-[#FF3B30]">*</span>
                    </label>
                    {backDoc.state === 'UPLOADED' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#00C853]/15 text-[#00C853] text-[10px] font-bold flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Verified Upload</span>
                      </span>
                    )}
                    {(backDoc.state === 'UPLOADING' || backDoc.state === 'VALIDATING') && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center space-x-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Uploading {backDoc.progress}%</span>
                      </span>
                    )}
                    {backDoc.state === 'FAILED' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FF3B30]/15 text-[#FF3B30] text-[10px] font-bold flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Upload Failed</span>
                      </span>
                    )}
                  </div>

                  {backDoc.state === 'UPLOADED' && backDoc.previewUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-[#333] bg-[#121212]">
                      {backDoc.previewUrl.startsWith('data:application/pdf') || backDoc.previewUrl.endsWith('.pdf') ? (
                        <div className="h-32 w-full flex flex-col items-center justify-center p-3 text-center">
                          <FileCheck className="w-8 h-8 text-[#00C853] mb-1" />
                          <span className="text-xs font-bold text-white">PDF Document Verified</span>
                          <span className="text-[10px] text-[#8A8A8A]">Back ID</span>
                        </div>
                      ) : (
                        <img src={backDoc.previewUrl} alt="ID Back" className="h-32 w-full object-cover" />
                      )}
                      <div className="p-2 bg-[#161616] flex items-center justify-between border-t border-[#222]">
                        <span className="text-[10px] text-[#8A8A8A] truncate max-w-[140px]">
                          {backDoc.record?.fileName || 'Back ID Photo'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBackDoc({ state: 'IDLE', progress: 0 })}
                          className="bg-[#222] hover:bg-[#333] text-white text-[10px] px-2.5 py-1 rounded-md font-bold transition-colors"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-[#333] hover:border-[#00C853]/60 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 transition-colors min-h-[140px] relative">
                      {(backDoc.state === 'UPLOADING' || backDoc.state === 'VALIDATING') ? (
                        <div className="flex flex-col items-center justify-center space-y-2 py-4 w-full">
                          <Loader2 className="w-6 h-6 animate-spin text-[#00C853]" />
                          <span className="text-xs font-bold text-white">Uploading & Verifying Back Document...</span>
                          <div className="w-full max-w-[200px] bg-[#222] rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                              className="bg-[#00C853] h-full transition-all duration-300 rounded-full"
                              style={{ width: `${backDoc.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : backDoc.state === 'FAILED' ? (
                        <div className="flex flex-col items-center justify-center space-y-2 text-center py-2">
                          <AlertCircle className="w-6 h-6 text-[#FF3B30]" />
                          <span className="text-xs font-bold text-[#FF3B30]">{backDoc.error || 'Upload failed'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (backDoc.file) {
                                executeUpload('back', backDoc.file);
                              } else {
                                setBackDoc({ state: 'IDLE', progress: 0 });
                              }
                            }}
                            className="px-3 py-1.5 bg-[#FF3B30]/20 hover:bg-[#FF3B30]/30 text-[#FF3B30] font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors mt-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Upload</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => startCamera('back', 'environment')}
                              className="px-3 py-2 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-colors"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Use Camera</span>
                            </button>
                            
                            <label className="cursor-pointer px-3 py-2 bg-[#222] hover:bg-[#333] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 border border-[#333] transition-colors">
                              <Upload className="w-4 h-4 text-[#8A8A8A]" />
                              <span>Gallery / File</span>
                              <input 
                                type="file" 
                                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*,application/pdf,.pdf" 
                                onChange={(e) => handleFileUpload(e, 'back')} 
                                className="hidden" 
                              />
                            </label>
                          </div>
                          <span className="text-[10px] text-[#8A8A8A]">Snap photo directly or select from device</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || isAnyUploading || !isFrontReady || (requiresBack && !isBackReady)}
            className="w-full py-4 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs rounded-xl transition-all shadow-xl shadow-[#00C853]/20 flex items-center justify-center space-x-2 uppercase tracking-wider"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Authentication Request...</span>
              </>
            ) : isAnyUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Documents to Server...</span>
              </>
            ) : (!isFrontReady || (requiresBack && !isBackReady)) ? (
              <span>Upload Required ID Documents to Continue</span>
            ) : (
              <>
                <span>Submit Real Name Authentication</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* LIVE CAMERA MODAL */}
      {activeCameraTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative text-white space-y-4 p-4 font-sans flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#222]">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-[#00C853]" />
                <h3 className="text-sm font-extrabold text-white">
                  Take Photo - ID {activeCameraTarget === 'front' ? 'Front' : 'Back'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="p-1.5 bg-[#222] hover:bg-[#333] text-[#8A8A8A] hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-6 bg-[#1A1A1A] rounded-xl border border-[#333] text-center space-y-4">
                <AlertCircle className="w-8 h-8 text-[#FF3B30] mx-auto" />
                <p className="text-xs text-[#FF3B30]">{cameraError}</p>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <label className="cursor-pointer px-4 py-2 bg-[#00C853] text-black font-extrabold rounded-xl text-xs flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Choose File Instead</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleFileUpload(e, activeCameraTarget);
                        closeCameraModal();
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => startCamera(activeCameraTarget, facingMode)}
                    className="px-4 py-2 bg-[#222] text-white font-bold rounded-xl text-xs"
                  >
                    Retry Camera
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-[#333]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Document Frame Guide Overlay */}
                <div className="absolute inset-4 border-2 border-dashed border-[#00C853]/60 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="bg-black/60 px-3 py-1 rounded-full text-[10px] text-white font-mono font-bold">
                    Align ID Document Within Frame
                  </span>
                </div>

                {cameraInitializing && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs font-mono text-[#00C853]">
                    Initializing Camera...
                  </div>
                )}
              </div>
            )}

            {!cameraError && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={toggleCameraFacingMode}
                  className="px-3 py-2 bg-[#222] hover:bg-[#333] text-xs font-bold text-white rounded-xl flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>Switch Camera</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={closeCameraModal}
                    className="px-4 py-2 bg-[#1F1F1F] text-white text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={cameraInitializing}
                    className="px-5 py-2.5 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-50 text-black text-xs font-extrabold rounded-xl shadow-lg flex items-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* KYC SUCCESS CONFIRMATION MODAL */}
      <KYCConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        documentType={kycData?.documentType || documentType}
        documentNumber={kycData?.documentNumber || documentNumber}
      />
    </div>
  );
};
