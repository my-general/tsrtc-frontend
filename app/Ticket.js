// tsrtc-frontend/app/Ticket.js
'use client';
import QRCode from "react-qr-code";

export default function Ticket({ ticketInfo, journeyInfo }) {
  // We'll encode the ticket details into the QR code as a JSON string
  const qrCodeValue = JSON.stringify({
    ticketId: ticketInfo.ticket_id,
    amount: ticketInfo.amount,
    timestamp: ticketInfo.created_at,
    ...journeyInfo
  });

  return (
    <div className="p-6 bg-slate-50 rounded-lg border border-dashed border-slate-400">
      <div className="text-center pb-4 border-b border-dashed border-slate-300">
        <h2 className="text-xl font-bold text-green-700">Payment Successful</h2>
        <p className="text-gray-500 text-sm">Your e-Ticket is ready</p>
      </div>

      <div className="flex justify-between items-center my-4">
        <div>
          <p className="text-xs text-gray-500">From</p>
          <p className="font-bold text-gray-800">{journeyInfo.from}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 text-right">To</p>
          <p className="font-bold text-gray-800">{journeyInfo.to}</p>
        </div>
      </div>
      
      <div className="my-6 p-4 bg-white rounded-lg flex justify-center">
        <QRCode value={qrCodeValue} size={180} />
      </div>

      <div className="text-center text-xs text-gray-500">
        <p>Ticket ID: {ticketInfo.ticket_id}</p>
        <p>Paid: ₹{parseFloat(ticketInfo.amount).toFixed(2)}</p>
        <p>Date: {new Date(ticketInfo.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}