'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Ticket from './Ticket';

// This wrapper is necessary for useSearchParams to work correctly in Next.js
export default function HomePageWrapper() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Loading Route...</div>}>
      <HomePage />
    </Suspense>
  );
}

function HomePage() {
  const searchParams = useSearchParams();

  const [stops, setStops] = useState([]);
  const [selectedFrom, setSelectedFrom] = useState('');
  const [selectedTo, setSelectedTo] = useState('');
  const [fareInfo, setFareInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketData, setTicketData] = useState(null);
  const [routeId, setRouteId] = useState(null);

  useEffect(() => {
    const routeFromUrl = searchParams.get('routeId');
    const stopFromUrl = searchParams.get('currentStop');

    if (routeFromUrl) {
      setRouteId(routeFromUrl);
      
      const fetchStopsAndSetDefaults = async () => {
        try {
          // Use the production API URL
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/routes/${routeFromUrl}/stops`);
          if (!res.ok) throw new Error(`Failed to fetch stops for route ${routeFromUrl}`);
          const data = await res.json();
          
          setStops(data);
          
          if (stopFromUrl) {
            setSelectedFrom(stopFromUrl);
          }
        } catch (err) {
          setError(err.message);
        }
      };

      fetchStopsAndSetDefaults();

    } else {
      setError("Invalid URL. Please scan a valid QR code.");
    }
  }, [searchParams]);

  const handleCalculateFare = async () => {
    if (!selectedFrom || !selectedTo) {
      setError('Please select a starting point and a destination.');
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
      // Use the production API URL
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: routeId,
          fromStopName: selectedFrom,
          toStopName: selectedTo,
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
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: fareInfo.amount,
      currency: fareInfo.currency,
      name: "TSRTC e-Ticket",
      description: `Ticket from ${selectedFrom} to ${selectedTo}`,
      order_id: fareInfo.id,
      handler: async function (response) {
        try {
            // Use the production API URL
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                })
            });
            const result = await res.json();
            if(result.status === 'success') {
                setTicketData(result.ticket);
                setFareInfo(null);
            } else {
                setError('Payment verification failed. Please contact support.');
            }
        } catch (err) {
            setError('An error occurred during payment verification.');
        }
      },
      prefill: {
        name: "Sandeep Kumar",
        email: "sandeep@example.com",
        contact: "9999999999"
      },
      theme: {
        color: "#F37254"
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 bg-white rounded-lg shadow-md font-sans">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">TSRTC e-Ticket</h1>
        {routeId ? (
            <p className="text-gray-500">Bus No: {routeId}</p>
        ) : (
            <p className="text-red-500">Waiting for QR Code data...</p>
        )}
      </header>
      
      {ticketData ? (
        <Ticket ticketInfo={ticketData} journeyInfo={{ from: selectedFrom, to: selectedTo }} />
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="from" className="block text-sm font-medium text-gray-600">From</label>
            <select
              id="from"
              value={selectedFrom}
              onChange={(e) => setSelectedFrom(e.target.value)}
              className="w-full mt-1 p-2 bg-white rounded border border-gray-300"
              disabled={!stops.length}
            >
              <option value="">Select a starting point...</option>
              {stops.map((stop) => (
                <option key={stop.stop_sequence} value={stop.stop_name}>
                  {stop.stop_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="to" className="block text-sm font-medium text-gray-600">To</label>
            <select
              id="to"
              value={selectedTo}
              onChange={(e) => setSelectedTo(e.target.value)}
              className="w-full mt-1 p-2 bg-white rounded border border-gray-300"
              disabled={!stops.length}
            >
              <option value="">Select a destination...</option>
              {stops.map((stop) => (
                <option key={stop.stop_sequence} value={stop.stop_name}>
                  {stop.stop_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCalculateFare}
            disabled={isLoading || !routeId}
            className="w-full py-2 px-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Calculating...' : 'Calculate Fare'}
          </button>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {fareInfo && (
            <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500">
              <p className="font-semibold text-lg text-gray-800">
                Fare: ₹{(fareInfo.amount / 100).toFixed(2)}
              </p>
              <button onClick={handlePayment} className="w-full mt-4 py-2 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                Pay Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
