'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, Loader2, Music, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';

interface FileUploaderProps {
  value?: string;
  onUpload: (url: string) => void;
  folder?: 'audio' | 'images';
  accept?: string;
  label?: string;
  placeholder?: string;
}

export default function FileUploader({
  value = '',
  onUpload,
  folder = 'audio',
  accept = 'audio/*',
  label = 'Fayl Yuklash',
  placeholder = 'Fayl tanlang yoki URL kiriting...',
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [manualUrl, setManualUrl] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAudio = folder === 'audio';
  const Icon = isAudio ? Music : ImageIcon;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Fayl hajmi 50MB dan oshmasligi kerak!');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // 1. Get signed upload URL from our API route
      const initRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          folder: folder,
          contentType: file.type,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || 'Yuklashni boshlashda xatolik');
      }

      const { token, path, publicUrl } = await initRes.json();
      setProgress(30);

      // 2. Upload directly to Supabase using the signed URL
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client sozlanmagan');
      }

      const { error: uploadError } = await supabase.storage
        .from('cefr-assets')
        .uploadToSignedUrl(path, token, file);

      if (uploadError) {
        throw new Error(uploadError.message || 'Faylni yuklashda xatolik yuz berdi');
      }

      setProgress(100);
      setManualUrl(publicUrl);
      onUpload(publicUrl);
      toast.success(`${isAudio ? 'Audio' : 'Rasm'} muvaffaqiyatli yuklandi!`);
    } catch (error: any) {
      toast.error(error.message || 'Fayl yuklashda xatolik yuz berdi.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualUrlChange = (url: string) => {
    setManualUrl(url);
    onUpload(url);
  };

  const handleClear = () => {
    setManualUrl('');
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasValue = !!manualUrl?.trim();

  if (isAudio) {
    return (
      <div className="space-y-2">
        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>

        {hasValue ? (
          <div className="flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Music className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Audio Fayl Yuklangan</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Tizimda faol
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border border-slate-200 dark:border-slate-800 transition"
              >
                O'zgartirish
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 p-2 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800/80 hover:border-indigo-500 dark:hover:border-indigo-400 p-6 rounded-2xl cursor-pointer transition bg-white dark:bg-slate-950 ${uploading ? 'opacity-50 cursor-wait' : ''}`}
          >
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-2.5">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            {uploading ? (
              <div className="text-center">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Yuklanmoqda...</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{progress}% bajarildi</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Audio fayl yuklanmagan</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Bosing va audio faylni yuklang (Maksimal: 50MB)</p>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden mt-2">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>

      {/* URL Input with upload trigger */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">
            <Icon className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => handleManualUrlChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs focus:outline-none transition font-medium ${
              hasValue
                ? 'border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500'
            }`}
          />
          {hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition border ${
            uploading
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-wait'
              : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {progress}%
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              Yuklash
            </>
          )}
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Status indicator */}
      {hasValue && !uploading && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
          <CheckCircle className="w-3 h-3" />
          <span className="truncate max-w-[400px]">{manualUrl}</span>
        </div>
      )}
    </div>
  );
}
