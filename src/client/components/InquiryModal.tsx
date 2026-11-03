import React, { useState } from "react";
import { X, Send, PhoneCall, User, Calendar, MapPin, MessageSquare, Mail } from "lucide-react";
import { InquiryFormData } from "../types";

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItems?: string[];
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  preselectedItems = [],
}) => {
  const [form, setForm] = useState<InquiryFormData>({
    name: "",
    phone: "",
    email: "",
    date: "",
    location: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", phone: "", email: "", date: "", location: "", message: "" });
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#f0e9ea] bg-gradient-to-r from-[#fde7ed]/40 to-white flex items-start justify-between">
          <div>
            <h2 className="font-serif-cormorant text-2xl font-medium text-[#1d1a1c]">
              Submit an Inquiry
            </h2>
            <p className="text-xs text-[#80777d] mt-1">
              Tell us about your event and we'll get back to you shortly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-[#f0e9ea] flex items-center justify-center transition mt-0.5"
          >
            <X className="w-5 h-5 text-[#80777d]" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                <Send className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-serif-cormorant text-2xl font-medium text-[#1d1a1c]">
                Inquiry Sent!
              </h3>
              <p className="text-sm text-[#80777d]">
                Thank you! We'll contact you within 24 hours to discuss your event.
              </p>
            </div>
          ) : (
            <form id="inquiry-form" onSubmit={handleSubmit} className="space-y-4">
              {preselectedItems.length > 0 && (
                <div className="p-3 rounded-xl bg-[#fde7ed]/50 border border-[#ef5b78]/20 text-xs text-[#80777d]">
                  <span className="font-medium text-[#ef5b78]">Items of interest: </span>
                  {preselectedItems.join(", ")}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-[#80777d] mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Your Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Rohit Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9ea] bg-[#fffafb] text-sm text-[#1d1a1c] placeholder:text-[#c8bdc1] focus:outline-none focus:ring-2 focus:ring-[#ef5b78]/30 focus:border-[#ef5b78] transition"
                  />
                </div>
                {/* Phone */}
                <div>
                  <label className="text-xs font-medium text-[#80777d] mb-1.5 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" />
                    Phone Number *
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+977 98XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9ea] bg-[#fffafb] text-sm text-[#1d1a1c] placeholder:text-[#c8bdc1] focus:outline-none focus:ring-2 focus:ring-[#ef5b78]/30 focus:border-[#ef5b78] transition"
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-[#80777d] mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9ea] bg-[#fffafb] text-sm text-[#1d1a1c] placeholder:text-[#c8bdc1] focus:outline-none focus:ring-2 focus:ring-[#ef5b78]/30 focus:border-[#ef5b78] transition"
                  />
                </div>
                {/* Date */}
                <div>
                  <label className="text-xs font-medium text-[#80777d] mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Event Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9ea] bg-[#fffafb] text-sm text-[#1d1a1c] focus:outline-none focus:ring-2 focus:ring-[#ef5b78]/30 focus:border-[#ef5b78] transition"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-medium text-[#80777d] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Venue / Location
                </label>
                <input
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Banquet hall name or city"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9ea] bg-[#fffafb] text-sm text-[#1d1a1c] placeholder:text-[#c8bdc1] focus:outline-none focus:ring-2 focus:ring-[#ef5b78]/30 focus:border-[#ef5b78] transition"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-[#80777d] mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Additional Message
                </label>
                <textarea
                  name="message"
                  rows={3}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us more about your event, guest count, theme ideas..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9ea] bg-[#fffafb] text-sm text-[#1d1a1c] placeholder:text-[#c8bdc1] focus:outline-none focus:ring-2 focus:ring-[#ef5b78]/30 focus:border-[#ef5b78] transition resize-none"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!submitted && (
          <div className="px-6 pb-6 pt-3 border-t border-[#f0e9ea] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-[#f0e9ea] text-[#80777d] hover:bg-[#f0e9ea] text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="inquiry-form"
              className="flex-1 py-2.5 rounded-full bg-[#ef5b78] hover:bg-[#e04766] text-white text-sm font-semibold shadow-md shadow-[#ef5b78]/25 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              Send Inquiry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
