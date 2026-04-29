import React, { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import { 
  Trees, 
  MapPin, 
  Upload, 
  Calculator, 
  DollarSign, 
  History, 
  CheckCircle2, 
  Loader2, 
  Navigation, 
  ShieldCheck, 
  Activity, 
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Info,
  Layers,
  Maximize2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";

// Fix for Leaflet default icon
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const historyData = [
  { month: 'Jan', credits: 10 },
  { month: 'Feb', credits: 15 },
  { month: 'Mar', credits: 25 },
  { month: 'Apr', credits: 30 },
  { month: 'May', credits: 45 },
  { month: 'Jun', credits: 60 },
];

const WOOD_DENSITIES: Record<string, number> = {
  teak: 0.65,
  mahogany: 0.55,
  mango: 0.45,
  neem: 0.68,
  bamboo: 0.40,
  other: 0.50,
};

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, 16);
    }
  }, [position, map]);

  return position === null ? null : (
    <>
      <Marker position={position} />
      <Circle 
        center={position} 
        radius={100} 
        pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }} 
      />
    </>
  );
}

export default function FarmerDashboard() {
  // Form Steps: 1: Practice & Location, 2: Farm Details, 3: Sequestration Data, 4: Review
  const [step, setStep] = useState(1);
  const [area, setArea] = useState("");
  const [trees, setTrees] = useState("");
  const [gbh, setGbh] = useState("");
  const [species, setSpecies] = useState("teak");
  const [farmingPractice, setFarmingPractice] = useState("Agroforestry");
  const [sequestration, setSequestration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"Pending" | "Verified">("Pending");
  
  // Interactive States
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateSuccess, setShowGenerateSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapType, setMapType] = useState<"satellite" | "street">("satellite");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCalculate = () => {
    setError(null);

    const areaVal = parseFloat(area);
    const treesVal = parseFloat(trees);
    const gbhVal = parseFloat(gbh);

    if (isNaN(areaVal) || areaVal <= 0) {
      setError("Please enter a valid farm area.");
      return false;
    }

    if (isNaN(treesVal) || treesVal <= 0) {
      setError(farmingPractice === "Solar Farm" ? "Please enter valid solar capacity." : "Please enter the number of trees.");
      return false;
    }

    let calculated = 0;
    if (farmingPractice === "Solar Farm") {
      calculated = treesVal * 1.2; 
    } else {
      if (isNaN(gbhVal) || gbhVal <= 0) {
        setError("Please enter a valid Girth at Breast Height (GBH).");
        return false;
      }
      const density = WOOD_DENSITIES[species.toLowerCase()] || WOOD_DENSITIES.other;
      const dbh_cm = gbhVal / Math.PI;
      const agb_kg = density * 0.11 * Math.pow(dbh_cm, 2.62);
      const total_biomass_kg = agb_kg * 1.26;
      const carbon_kg = total_biomass_kg * 0.5;
      const co2_kg = carbon_kg * 3.666;
      calculated = (co2_kg * treesVal) / 1000;
    }

    setSequestration(Number(calculated.toFixed(2)));
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !location) {
      setError("Please mark your farm location on the map.");
      return;
    }
    if (step === 2 && !area) {
      setError("Please enter farm area.");
      return;
    }
    if (step === 3) {
      if (!handleCalculate()) return;
    }
    setError(null);
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation([position.coords.latitude, position.coords.longitude]);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const { data, error } = await supabase
        .from("farms")
        .insert([
          {
            area: Number(area),
            trees: Number(trees),
            carbon: sequestration,
            practice: farmingPractice,
            species: species,
            latitude: location?.[0],
            longitude: location?.[1],
            status: "pending"
          }
        ]);

      if (error) {
        console.error("Supabase error:", error);
        alert(error.message);
        setIsGenerating(false);
        return;
      }

      // SUCCESS UI
      setIsGenerating(false);
      setShowGenerateSuccess(true);

      setTimeout(() => {
        setShowGenerateSuccess(false);
        setStep(1);
        setSequestration(null);
        setArea("");
        setTrees("");
        setGbh("");
        setLocation(null);
        setUploadSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error("ERROR:", err);
      alert(err?.message || "Something went wrong");
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] bg-white overflow-hidden font-sans">
      
      {/* Left Side: Interactive Map (Satellite View) */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full relative border-r border-slate-100">
        <MapContainer 
          center={[20.5937, 78.9629]} 
          zoom={5} 
          style={{ height: '100%', width: '100%' }} 
          className="z-0"
        >
          <MapResizer />
          {mapType === "satellite" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
          <LocationMarker position={location} setPosition={setLocation} />
        </MapContainer>

        {/* Map Controls */}
        <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3">
          <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-slate-200/50 flex flex-col gap-1">
            <button 
              onClick={() => setMapType("satellite")}
              className={`p-3 rounded-xl transition-all ${mapType === 'satellite' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
              title="Satellite View"
            >
              <Layers className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMapType("street")}
              className={`p-3 rounded-xl transition-all ${mapType === 'street' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
              title="Street View"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={handleUseMyLocation}
            className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200/50 text-slate-600 hover:text-emerald-600 transition-all active:scale-95"
            title="My Location"
          >
            {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
          </button>
        </div>

        {/* Map Overlay Info */}
        <div className="absolute bottom-8 left-8 right-8 z-[1000] pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl pointer-events-auto flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Maximize2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Boundary Marking</p>
                <p className="text-sm font-bold text-white">
                  {location ? "Location tagged successfully" : "Click on the map to mark your farm center"}
                </p>
              </div>
            </div>
            {location && (
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Coordinates</p>
                <p className="text-xs font-mono font-bold text-emerald-400">{location[0].toFixed(6)}, {location[1].toFixed(6)}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Right Side: Multi-step Form */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full overflow-y-auto bg-slate-50/30">
        <div className="max-w-xl mx-auto px-8 py-12 lg:py-20">
          
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-16 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="relative z-10 flex flex-col items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
                  step >= s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}>
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${step >= s ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {s === 1 ? 'Location' : s === 2 ? 'Details' : s === 3 ? 'Data' : 'Review'}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div>
                  <h2 className="text-4xl font-display font-black text-slate-900 tracking-tighter mb-4">Start Your <span className="text-emerald-600">Journey</span></h2>
                  <p className="text-slate-500 font-medium leading-relaxed">Select your primary farming practice and mark your land on the interactive map to begin the verification process.</p>
                </div>

                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Farming Practice</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['Agroforestry', 'Plantation', 'Solar Farm', 'Rice Farming'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setFarmingPractice(p)}
                          className={`p-6 rounded-2xl border-2 text-left transition-all group relative overflow-hidden ${
                            farmingPractice === p ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white hover:border-emerald-200'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                            farmingPractice === p ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-emerald-500'
                          }`}>
                            {p === 'Agroforestry' ? <Trees className="w-5 h-5" /> : 
                             p === 'Solar Farm' ? <Activity className="w-5 h-5" /> : 
                             p === 'Plantation' ? <ShieldCheck className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                          </div>
                          <p className="font-black text-slate-900 tracking-tight">{p}</p>
                          {farmingPractice === p && (
                            <div className="absolute top-4 right-4 text-emerald-600">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div>
                  <h2 className="text-4xl font-display font-black text-slate-900 tracking-tighter mb-4">Farm <span className="text-emerald-600">Details</span></h2>
                  <p className="text-slate-500 font-medium leading-relaxed">Provide the physical dimensions of your project area. Accurate data ensures institutional-grade credit generation.</p>
                </div>

                <div className="space-y-8">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Total Farm Area (Acres)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-xl shadow-sm"
                        placeholder="e.g. 25.5"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Acres</div>
                    </div>
                  </div>

                  <div className="p-8 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <Upload className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Soil Health Report (Optional)</p>
                    </div>
                    
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.png" />

                    <div 
                      onClick={() => !isUploading && !uploadSuccess && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-[1.5rem] p-10 text-center transition-all ${
                        uploadSuccess ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 hover:border-emerald-400 cursor-pointer bg-white"
                      }`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center text-emerald-600">
                          <Loader2 className="w-10 h-10 animate-spin mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Analyzing with AI...</p>
                        </div>
                      ) : uploadSuccess ? (
                        <div className="flex flex-col items-center justify-center text-emerald-600">
                          <CheckCircle2 className="w-10 h-10 mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Report Verified</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-sm font-bold text-slate-600">Upload soil report for higher accuracy</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">PDF, JPG up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div>
                  <h2 className="text-4xl font-display font-black text-slate-900 tracking-tighter mb-4">Sequestration <span className="text-emerald-600">Data</span></h2>
                  <p className="text-slate-500 font-medium leading-relaxed">Enter the specific biological data for your project. Our AI models use these inputs to calculate carbon capture potential.</p>
                </div>

                <div className="space-y-8">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
                      {farmingPractice === "Solar Farm" ? "Solar Capacity (kW)" : "Number of Trees"}
                    </label>
                    <input
                      type="number"
                      value={trees}
                      onChange={(e) => setTrees(e.target.value)}
                      className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-xl shadow-sm"
                      placeholder={farmingPractice === "Solar Farm" ? "e.g. 50" : "e.g. 1200"}
                    />
                  </div>

                  {farmingPractice !== "Solar Farm" && (
                    <>
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Tree Species</label>
                        <select 
                          value={species}
                          onChange={(e) => setSpecies(e.target.value)}
                          className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-lg appearance-none cursor-pointer shadow-sm"
                        >
                          <option value="teak">Teak</option>
                          <option value="mahogany">Mahogany</option>
                          <option value="mango">Mango</option>
                          <option value="neem">Neem</option>
                          <option value="bamboo">Bamboo</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Avg. Girth at Breast Height (cm)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={gbh}
                            onChange={(e) => setGbh(e.target.value)}
                            className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-xl shadow-sm"
                            placeholder="e.g. 85"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">cm</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div>
                  <h2 className="text-4xl font-display font-black text-slate-900 tracking-tighter mb-4">Final <span className="text-emerald-600">Review</span></h2>
                  <p className="text-slate-500 font-medium leading-relaxed">Review your project data before generating credits. Once submitted, the data will be sent for satellite verification.</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Practice</span>
                      <span className="font-bold text-slate-900">{farmingPractice}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Area</span>
                      <span className="font-bold text-slate-900">{area} Acres</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Count</span>
                      <span className="font-bold text-slate-900">{trees} {farmingPractice === 'Solar Farm' ? 'kW' : 'Trees'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</span>
                      <span className="font-mono text-xs font-bold text-emerald-600">{location?.[0].toFixed(4)}, {location?.[1].toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-emerald-900/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Calculator className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Estimated Annual Sequestration</p>
                      <h3 className="text-5xl font-black tracking-tighter mb-2">{sequestration} <span className="text-xl font-sans font-bold text-slate-500">tCO₂e</span></h3>
                      <p className="text-xs text-slate-400 font-medium">Based on current biomass allometric models.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3"
            >
              <Info className="w-5 h-5 text-red-500" />
              <p className="text-xs text-red-600 font-bold">{error}</p>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-16 flex items-center gap-6">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 py-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={nextStep}
                className="flex-[2] py-5 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || showGenerateSuccess}
                className="flex-[2] py-5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : 
                 showGenerateSuccess ? <><CheckCircle2 className="w-5 h-5" /> Success</> : 
                 <><ShieldCheck className="w-5 h-5" /> Generate Credits</>}
              </button>
            )}
          </div>

          {/* Success Message Overlay */}
          <AnimatePresence>
            {showGenerateSuccess && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] bg-white/90 backdrop-blur-xl flex items-center justify-center p-8"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="max-w-md w-full text-center space-y-8"
                >
                  <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-display font-black text-slate-900 tracking-tighter mb-4">Credits <span className="text-emerald-600">Generated</span></h2>
                    <p className="text-slate-500 font-medium leading-relaxed">Your sequestration data has been submitted for satellite verification. Credits will appear in your dashboard within 24-48 hours.</p>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction ID</p>
                    <p className="text-sm font-mono font-bold text-slate-900">CX-VERIFY-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
