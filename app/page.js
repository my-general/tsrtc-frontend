'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Ticket from './Ticket';

export default function HomePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your journey planner...</p>
        </div>
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}

function HomePage() {
  const searchParams = useSearchParams();

  // State for data
  const [allRoutes, setAllRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [fareInfo, setFareInfo] = useState(null);
  const [ticketData, setTicketData] = useState(null);

  // State for user selections
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedFrom, setSelectedFrom] = useState('');
  const [selectedTo, setSelectedTo] = useState('');
  
  // State for UI
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false); // New state for payment verification
  const [error, setError] = useState('');
  const [routeFromUrl, setRouteFromUrl] = useState(null);

  // Effect 1: Check for QR code mode on initial load
  useEffect(() => {
    const routeParam = searchParams.get('routeId');
    const stopParam = searchParams.get('currentStop');
    
    if (routeParam) {
      setRouteFromUrl(routeParam);
      setSelectedRoute(routeParam);
      if (stopParam) {
        setSelectedFrom(stopParam);
      }
    } else {
      // Manual Mode: Fetch all available routes
      const fetchRoutes = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`http://localhost:3001/api/routes`);
          if (!res.ok) throw new Error('Could not fetch routes.');
          const data = await res.json();
          setAllRoutes(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRoutes();
    }
  }, [searchParams]);

  // Effect 2: Fetch stops whenever a route is selected, with a cleanup function to prevent race conditions
  useEffect(() => {
    let isMounted = true;

    if (!selectedRoute) {
      setStops([]);
      setSelectedFrom('');
      setSelectedTo('');
      return;
    }

    const fetchStopsForRoute = async () => {
      setIsLoading(true);
      setStops([]); 
      if (!routeFromUrl) {
          setSelectedFrom('');
          setSelectedTo('');
      }

      try {
        const res = await fetch(`http://localhost:3001/api/routes/${selectedRoute}/stops`);
        if (!res.ok) throw new Error(`Failed to fetch stops for route ${selectedRoute}`);
        const data = await res.json();
        
        if (isMounted) {
            setStops(data);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStopsForRoute();

    return () => { isMounted = false; };
  }, [selectedRoute, routeFromUrl]);

  const handleCalculateFare = async () => {
    if (!selectedRoute || !selectedFrom || !selectedTo) {
      setError('Please select a route, starting point, and destination.');
      return;
    }
    if (selectedFrom === selectedTo) {
      setError('Start and destination cannot be the same.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setFareInfo(null);
    setTicketData(null);

    try {
      const res = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: selectedRoute, fromStopName: selectedFrom, toStopName: selectedTo,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Could not calculate fare.');
      }
      
      const data = await res.json();
      setFareInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePayment = async () => {
    if (!window.Razorpay) {
      setError('Payment system not available. Please try again later.');
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: fareInfo.amount,
      currency: fareInfo.currency,
      name: "TSRTC e-Ticket",
      description: `Ticket from ${selectedFrom} to ${selectedTo}`,
      order_id: fareInfo.id,
      handler: async function (response) {
        setIsVerifying(true);
        setError('');
        try {
          const res = await fetch('http://localhost:3001/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          const result = await res.json();
          if (result.status === 'success') {
            setTicketData(result.ticket);
            setFareInfo(null);
          } else {
            setError('Payment verification failed. Please contact support.');
          }
        } catch (err) {
          setError('Payment verification failed. Please try again.');
        } finally {
          setIsVerifying(false);
        }
      },
      prefill: { name: "Passenger", email: "passenger@example.com", contact: "9999999999" },
      theme: { color: "#F37254" },
      modal: {
        ondismiss: function() {
          if(!ticketData) setError('Payment was cancelled.');
        }
      }
    };
    
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleNewBooking = () => {
    // Reset all state to initial values
    setTicketData(null);
    setFareInfo(null);
    setError('');
    setSelectedRoute('');
    setSelectedFrom('');
    setSelectedTo('');
    setStops([]);
    
    // Re-fetch all routes if in manual mode
    if (!routeFromUrl) {
      const fetchRoutes = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`http://localhost:3001/api/routes`);
          if (!res.ok) throw new Error('Could not fetch routes.');
          const data = await res.json();
          setAllRoutes(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRoutes();
    }
  };

  const getStopKey = (stop, prefix, index) => {
    return `${prefix}-${selectedRoute}-${stop.stop_sequence}-${index}`.replace(/\s+/g, '-');
  };

  // Main Return Statement
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold text-lg">T</span>
            </div>
            <h1 className="text-2xl font-bold">TSRTC e-Ticket</h1>
          </div>
          {selectedRoute && (
            <p className="text-center text-blue-100 font-medium">
              Bus No: <span className="font-bold">{selectedRoute}</span>
              {routeFromUrl && (
                <span className="ml-2 text-sm bg-blue-500 px-2 py-1 rounded-full">QR Mode</span>
              )}
            </p>
          )}
        </div>

        {/* Conditional Rendering: Ticket View or Booking View */}
        {ticketData ? (
          <div>
            <Ticket ticketInfo={ticketData} journeyInfo={{ from: selectedFrom, to: selectedTo }} />
            <div className="p-6">
              <button
                onClick={handleNewBooking}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md"
              >
                Book Another Ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {!routeFromUrl && (
              <div className="space-y-2">
                <label htmlFor="route" className="block text-sm font-semibold text-gray-700 flex items-center"><span className="bg-blue-100 text-blue-600 p-1 rounded mr-2">🚌</span>Select Bus Route</label>
                <select id="route" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer" disabled={isLoading}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
                  <option value="" className="text-gray-500">Choose your route...</option>
                  {allRoutes.map((route) => (<option key={route.route_id} value={route.route_id} className="text-gray-900 py-2">{route.route_id} - {route.route_name}</option>))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="from" className="block text-sm font-semibold text-gray-700 flex items-center"><span className="bg-green-100 text-green-600 p-1 rounded mr-2">📍</span>From</label>
                <select id="from" value={selectedFrom} onChange={(e) => setSelectedFrom(e.target.value)} className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer" disabled={!stops.length || isLoading}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
                  <option value="" className="text-gray-500">Select start...</option>
                  {stops.map((stop, index) => (<option key={getStopKey(stop, 'from', index)} value={stop.stop_name} className="text-gray-900 py-2">{stop.stop_name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="to" className="block text-sm font-semibold text-gray-700 flex items-center"><span className="bg-red-100 text-red-600 p-1 rounded mr-2">🎯</span>To</label>
                <select id="to" value={selectedTo} onChange={(e) => setSelectedTo(e.target.value)} className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer" disabled={!stops.length || isLoading}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
                  <option value="" className="text-gray-500">Select destination...</option>
                  {stops.map((stop, index) => (<option key={getStopKey(stop, 'to', index)} value={stop.stop_name} className="text-gray-900 py-2">{stop.stop_name}</option>))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <button onClick={handleCalculateFare} disabled={isLoading || !selectedRoute || !selectedFrom || !selectedTo} className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md">
                {isLoading && !fareInfo ? (<span className="flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Calculating Fare...</span>) : ('Calculate Fare')}
              </button>
              {!routeFromUrl && (selectedRoute || selectedFrom || selectedTo) && (<button onClick={handleNewBooking} className="w-full py-2 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-200">Reset Selection</button>)}
            </div>
            {error && (<div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"><div className="flex items-center"><span className="text-red-500 mr-2">⚠️</span><p className="text-red-700 text-sm font-medium">{error}</p></div></div>)}
            {fareInfo && (
              <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-gray-800">Your Fare</h3><span className="text-green-600 text-2xl">💰</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">₹{(fareInfo.amount / 100).toFixed(2)}</p>
                <p className="text-sm text-gray-600 mb-4">Journey from <span className="font-semibold">{selectedFrom}</span> to <span className="font-semibold">{selectedTo}</span></p>
                <button onClick={handlePayment} disabled={isVerifying} className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md">
                  {isVerifying ? (<span className="flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Verifying Payment...</span>) : ('Pay Now & Get Ticket')}
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <p className="text-center text-xs text-gray-500">Safe and convenient bus travel with TSRTC</p>
        </div>
      </div>
    </div>
  );
}

