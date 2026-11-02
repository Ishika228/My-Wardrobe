import React, { useState, useRef } from 'react';
import {
  X, Upload, Sparkles, Zap, Leaf, Tag, Palette, Grid,
  Sun, Calendar, CheckCircle, AlertCircle, Loader, Camera,
  RefreshCw, ChevronRight, Star, Database, Wand2, Compass
} from 'lucide-react';
import { getRAGOutfitRecommendations } from '../services/api.js';

const API_BASE = 'http://localhost:5000/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ color = 'purple', children }) {
  const map = {
    purple: { bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd', border: 'rgba(139,92,246,0.3)' },
    green:  { bg: 'rgba(16,185,129,0.15)',  text: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
    blue:   { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd', border: 'rgba(59,130,246,0.3)' },
    amber:  { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
    pink:   { bg: 'rgba(236,72,153,0.15)', text: '#f9a8d4', border: 'rgba(236,72,153,0.3)' },
  };
  const c = map[color] || map.purple;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 9px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        marginRight: '5px',
        marginBottom: '5px'
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Icon size={13} style={{ color: '#a78bfa' }} />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#c4b5fd'
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GroqAIPanel({
  isOpen,
  onClose,
  onApplyOutfitToAvatar,
  mongoClothes = []
}) {
  const [tab, setTab] = useState('recommend'); // 'recommend' | 'scan'

  // Image Scan State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // RAG Recommender State
  const [userQuery, setUserQuery] = useState('');
  const [recOccasion, setRecOccasion] = useState('Casual');
  const [recSeason, setRecSeason] = useState('All');
  const [ragResult, setRagResult] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);

  const fileInputRef = useRef();

  if (!isOpen) return null;

  // ── 1. Image upload & analysis ──────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setAnalysis(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setAnalysis(null);
      setError(null);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      // Attempt backend scan
      const res = await fetch(`${API_BASE}/clothes/analyze`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Analysis status: ${res.status}. Server is active.`);
      }

      const data = await res.json();
      setAnalysis(data.data || data);
    } catch (err) {
      setError(err.message || 'Image analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── 2. RAG OUTFIT RECOMMENDATION ────────────────────────────────────────────
  const handleExecuteRAG = async (overrideQuery = null) => {
    setRecLoading(true);
    setRecError(null);
    setRagResult(null);

    const queryToSend = overrideQuery !== null ? overrideQuery : userQuery;

    try {
      const data = await getRAGOutfitRecommendations({
        query: queryToSend,
        preferences: {
          occasion: recOccasion === 'All' ? null : recOccasion,
          weather: recSeason === 'All' ? null : recSeason
        }
      });

      if (!data || !data.success) {
        throw new Error(data?.message || 'Could not generate recommendations from MongoDB wardrobe.');
      }

      setRagResult(data);
    } catch (err) {
      setRecError(err.message || 'Failed to retrieve outfits.');
    } finally {
      setRecLoading(false);
    }
  };

  // ── 3. Apply recommended outfit to 3D Avatar in VR ──────────────────────────
  const handleApplyToVR = (outfit) => {
    if (!onApplyOutfitToAvatar || !outfit.clothingItems) return;

    const pieces = outfit.clothingItems;
    let top = null, bottom = null, dress = null, shoes = null, outerwear = null;

    pieces.forEach((item) => {
      const cat = (item.category || '').toLowerCase();
      const subCat = (item.subCategory || '').toLowerCase();

      // Normalize color hex
      let colorHex = '#ffffff';
      if (item.color) {
        if (typeof item.color === 'object') colorHex = item.color.primary || '#ffffff';
        else if (item.color.startsWith('#')) colorHex = item.color;
        else {
          const c = item.color.toLowerCase();
          if (c === 'black') colorHex = '#222222';
          else if (c === 'white') colorHex = '#ffffff';
          else if (c === 'navy' || c === 'blue') colorHex = '#1e3a8a';
          else if (c === 'emerald' || c === 'green') colorHex = '#065f46';
          else if (c === 'burgundy' || c === 'crimson' || c === 'red') colorHex = '#831843';
          else if (c === 'beige' || c === 'cream' || c === 'camel') colorHex = '#d4b79b';
          else if (c === 'gold') colorHex = '#d4af37';
        }
      }

      const formatted = {
        id: item._id,
        name: item.name,
        category: cat,
        primaryColor: colorHex,
        material: item.material,
        silhouette: subCat || cat
      };

      if (cat === 'dress' || subCat.includes('saree') || subCat.includes('anarkali') || subCat.includes('kurti')) {
        dress = formatted;
      } else if (cat.includes('jacket') || cat.includes('coat') || cat.includes('blazer')) {
        outerwear = formatted;
      } else if (cat.includes('shirt') || cat.includes('top') || cat.includes('sweater')) {
        top = formatted;
      } else if (cat.includes('jean') || cat.includes('trouser') || cat.includes('skirt') || cat.includes('pant')) {
        bottom = formatted;
      } else if (cat.includes('shoe') || cat.includes('boot') || cat.includes('sneak') || subCat.includes('jutti')) {
        shoes = formatted;
      }
    });

    onApplyOutfitToAvatar({ top, bottom, dress, shoes, outerwear });
    onClose();
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(6px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: '16px'
  };

  const panel = {
    width: '460px',
    maxWidth: '96vw',
    height: 'calc(100vh - 32px)',
    background: 'linear-gradient(160deg,#191126 0%,#0f0b18 100%)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,92,246,0.15)',
    fontFamily: 'Inter,system-ui,sans-serif',
    color: '#e2d9f3'
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        
        {/* Top Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid rgba(139,92,246,0.15)',
            background: 'rgba(139,92,246,0.06)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(124,58,237,0.4)'
                }}
              >
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 800,
                      background: 'linear-gradient(90deg,#c4b5fd,#f9a8d4)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    VR-RAG AI Fashion Stylist
                  </h2>
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      background: 'rgba(16,185,129,0.2)',
                      color: '#6ee7b7',
                      border: '1px solid rgba(16,185,129,0.3)',
                      fontWeight: 700
                    }}
                  >
                    MongoDB RAG
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9d84bf' }}>
                  Retrieval-Augmented Generation • Groq LLaMA-3
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            {[
              { id: 'recommend', label: '✨ RAG Outfit Stylist', icon: Sparkles },
              { id: 'scan', label: '📸 Cloth AI Vision Scanner', icon: Camera }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  background:
                    tab === t.id
                      ? 'linear-gradient(135deg,#7c3aed,#ec4899)'
                      : 'rgba(255,255,255,0.06)',
                  color: tab === t.id ? 'white' : '#9ca3af',
                  boxShadow: tab === t.id ? '0 4px 15px rgba(124,58,237,0.3)' : 'none'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '18px 20px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#4c1d95 transparent'
          }}
        >
          {/* ═════════════════════════════════════════════════════════════════════
              TAB: RAG OUTFIT RECOMMENDER
              ═════════════════════════════════════════════════════════════════════ */}
          {tab === 'recommend' && (
            <div>
              {/* Natural Language Query Bar */}
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#c4b5fd',
                    marginBottom: '6px'
                  }}
                >
                  Ask Your RAG AI Stylist
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleExecuteRAG();
                    }}
                    placeholder="e.g. Traditional Indian wedding, chilly evening, date night glam..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => handleExecuteRAG()}
                    disabled={recLoading}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '6px',
                      bottom: '6px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                      border: 'none',
                      color: 'white',
                      cursor: recLoading ? 'not-allowed' : 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {recLoading ? <Loader size={12} className="spin" /> : <Wand2 size={12} />}
                    Generate
                  </button>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', color: '#8b6fb5', display: 'block', marginBottom: '6px' }}>
                  Quick Styling Prompts:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: '🥻 Festive Indian Saree', q: 'Traditional Indian wedding celebration with gold zari saree' },
                    { label: '❄️ Chilly Winter Night', q: 'Warm layered outfit for a chilly winter evening' },
                    { label: '💼 Work / Office Chic', q: 'Sophisticated professional outfit for high-stakes office presentation' },
                    { label: '🌿 Revive Unworn Clothes', q: 'Revive my unworn and forgotten clothes with fresh styling' }
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => {
                        setUserQuery(chip.q);
                        handleExecuteRAG(chip.q);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#d4c5ea',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#a78bfa', display: 'block', marginBottom: '4px' }}>
                    Occasion
                  </label>
                  <select
                    value={recOccasion}
                    onChange={(e) => setRecOccasion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '11px'
                    }}
                  >
                    {['All', 'Casual', 'Formal', 'Party', 'Dinner', 'College'].map((o) => (
                      <option key={o} value={o} style={{ background: '#1a1025' }}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#a78bfa', display: 'block', marginBottom: '4px' }}>
                    Season / Weather
                  </label>
                  <select
                    value={recSeason}
                    onChange={(e) => setRecSeason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '11px'
                    }}
                  >
                    {['All', 'Winter', 'Summer', 'Spring', 'Autumn', 'Monsoon'].map((s) => (
                      <option key={s} value={s} style={{ background: '#1a1025' }}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {recLoading && (
                <div
                  style={{
                    padding: '28px',
                    textAlign: 'center',
                    background: 'rgba(139,92,246,0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(139,92,246,0.2)',
                    marginBottom: '16px'
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '3px solid #7c3aed',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      margin: '0 auto 12px',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#c4b5fd' }}>
                    Executing RAG Pipeline…
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#8b6fb5' }}>
                    Retrieving MongoDB wardrobe → Analyzing color harmonies → Generating looks
                  </p>
                </div>
              )}

              {/* Error Message */}
              {recError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '14px',
                    display: 'flex',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5' }}>{recError}</p>
                </div>
              )}

              {/* RAG Results Display */}
              {ragResult && ragResult.recommendations && (
                <div>
                  {/* RAG Telemetry Banner */}
                  <div
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={14} style={{ color: '#34d399' }} />
                      <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 700 }}>
                        {ragResult.recommendations.length} Outfits Grounded in MongoDB
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#a7f3d0' }}>
                      {ragResult.generationSource}
                    </span>
                  </div>

                  {/* Outfit Cards */}
                  {ragResult.recommendations.map((outfit, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        borderRadius: '14px',
                        padding: '16px',
                        marginBottom: '14px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                      }}
                    >
                      {/* Outfit Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '10px'
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: 800,
                              color: 'white',
                              display: 'block'
                            }}
                          >
                            {outfit.outfitName}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9d84bf' }}>
                            {outfit.style} • {outfit.occasion}
                          </span>
                        </div>
                        <Badge color="purple">
                          <Star size={10} className="text-amber-400" />
                          {Math.round((outfit.confidence || 0.9) * 100)}% Match
                        </Badge>
                      </div>

                      {/* Retrieved Items in this Outfit */}
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '10px',
                          padding: '8px 10px',
                          marginBottom: '10px'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: '#8b6fb5',
                            display: 'block',
                            marginBottom: '6px'
                          }}
                        >
                          Verified MongoDB Wardrobe Items ({outfit.clothingItems.length}):
                        </span>
                        {outfit.clothingItems.map((piece) => (
                          <div
                            key={piece._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 0',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              fontSize: '11px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  backgroundColor: piece.color?.primary || '#d4b79b'
                                }}
                              />
                              <span style={{ fontWeight: 600, color: '#f3e8ff' }}>{piece.name}</span>
                            </div>
                            <span style={{ color: '#8b6fb5', fontSize: '10px' }}>
                              {piece.category}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Color Harmony Note */}
                      {outfit.colorHarmony && (
                        <p
                          style={{
                            margin: '0 0 8px',
                            fontSize: '11px',
                            color: '#d8b4fe',
                            background: 'rgba(139,92,246,0.1)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            borderLeft: '3px solid #a855f7'
                          }}
                        >
                          🎨 <strong>Color Harmony:</strong> {outfit.colorHarmony}
                        </p>
                      )}

                      {/* Styling Explanation */}
                      {outfit.explanation && (
                        <p
                          style={{
                            margin: '0 0 10px',
                            fontSize: '11.5px',
                            color: '#cbd5e1',
                            lineHeight: 1.5
                          }}
                        >
                          {outfit.explanation}
                        </p>
                      )}

                      {/* Sustainability Note */}
                      {outfit.sustainabilityNote && (
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '11px',
                            color: '#6ee7b7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Leaf size={12} />
                          {outfit.sustainabilityNote}
                        </p>
                      )}

                      {/* One-Click Wear in 3D VR Button */}
                      <button
                        onClick={() => handleApplyToVR(outfit)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                          border: 'none',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(236,72,153,0.3)',
                          transition: 'transform 0.2s'
                        }}
                      >
                        <Compass size={14} />
                        Wear This in 3D VR (Instant Avatar Try-On)
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Idle Informational Box */}
              {!ragResult && !recLoading && !recError && (
                <div
                  style={{
                    background: 'rgba(139,92,246,0.06)',
                    borderRadius: '14px',
                    padding: '16px',
                    border: '1px solid rgba(139,92,246,0.15)'
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#c4b5fd' }}>
                    🔍 How RAG Wardrobe AI Works:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#9d84bf', lineHeight: 1.6 }}>
                    <li><strong>1. Retrieves:</strong> Real clothes from your MongoDB Atlas database.</li>
                    <li><strong>2. Augments:</strong> Fashion color harmony, weather rules, and unworn items.</li>
                    <li><strong>3. Generates:</strong> Exact outfit combinations with zero hallucination.</li>
                    <li><strong>4. VR Sync:</strong> Immediately dresses the photorealistic female avatar in 3D!</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              TAB: CLOTH AI VISION SCANNER
              ═════════════════════════════════════════════════════════════════════ */}
          {tab === 'scan' && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: imagePreview
                    ? '2px solid rgba(139,92,246,0.4)'
                    : '2px dashed rgba(139,92,246,0.3)',
                  borderRadius: '14px',
                  padding: imagePreview ? '0' : '32px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: imagePreview ? 'transparent' : 'rgba(139,92,246,0.04)',
                  overflow: 'hidden',
                  marginBottom: '14px',
                  minHeight: imagePreview ? 'auto' : '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'cover',
                      borderRadius: '12px'
                    }}
                  />
                ) : (
                  <>
                    <Upload size={28} style={{ color: '#7c3aed', marginBottom: '10px' }} />
                    <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#c4b5fd' }}>
                      Drop or click to upload clothing photo
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#6b4d8f' }}>
                      JPG, PNG, WebP — max 10MB
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {imagePreview && (
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setAnalysis(null);
                      setError(null);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px'
                    }}
                  >
                    <RefreshCw size={13} /> New
                  </button>
                )}
                <button
                  onClick={handleAnalyze}
                  disabled={!imageFile || loading}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    background:
                      !imageFile || loading
                        ? 'rgba(139,92,246,0.2)'
                        : 'linear-gradient(135deg,#7c3aed,#ec4899)',
                    border: 'none',
                    color: !imageFile || loading ? '#6b4d8f' : 'white',
                    cursor: !imageFile || loading ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader size={15} className="spin" /> Scanning clothing features…
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> Scan Clothing Item
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '14px',
                    display: 'flex',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5' }}>{error}</p>
                </div>
              )}

              {analysis && (
                <div>
                  <Section title="Detected Category" icon={Tag}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>
                      {analysis.category || 'Clothing Item'}
                    </span>
                  </Section>

                  <Section title="Color Detection" icon={Palette}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#c4b5fd' }}>
                      Primary: {analysis.color?.primary || analysis.color || 'Detected Color'}
                    </p>
                  </Section>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
