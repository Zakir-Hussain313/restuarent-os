"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "General Enquiry", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Simulated submit
    setTimeout(() => setSubmitted(true), 600);
  }

  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-16 bg-[#1a1815] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #e8570e 1px, transparent 1px)", backgroundSize: "30px 30px" }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-3">Get In Touch</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">We&apos;d Love to Hear From You</h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Reservations, catering enquiries, feedback, or just a hello — we&apos;re always happy to chat.
          </p>
        </div>
      </section>

      <section className="py-16 bg-[#faf9f7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact info */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1815] mb-1">Contact Information</h2>
              <p className="text-sm text-[#8a8680]">Reach us through any of these channels.</p>
            </div>

            {[
              { icon: MapPin, label: "Address",      value: "Block 7, Clifton\nKarachi, Sindh 75600" },
              { icon: Phone,  label: "Phone",        value: "+92 21 3456 7890" },
              { icon: Mail,   label: "Email",        value: "hello@ricenspice.pk" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#e8570e]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#8a8680] uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-[#1a1815] mt-0.5 whitespace-pre-line">{value}</p>
                </div>
              </div>
            ))}

            {/* Hours */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#e8570e]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#8a8680] uppercase tracking-wider mb-1.5">Opening Hours</p>
                {[
                  { days: "Mon – Thu", hours: "12:00 PM – 11:00 PM" },
                  { days: "Fri – Sat", hours: "12:00 PM – 12:00 AM" },
                  { days: "Sunday",    hours: "1:00 PM – 11:00 PM"  },
                ].map(({ days, hours }) => (
                  <div key={days} className="flex justify-between gap-4 text-sm text-[#1a1815] mb-1">
                    <span className="font-medium">{days}</span>
                    <span className="text-[#8a8680]">{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div className="rounded-2xl overflow-hidden border border-[#ebe9e4] aspect-4/3 bg-linear-to-br from-[#f4f2ef] to-[#ebe9e4] flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-8 h-8 text-[#e8570e] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#1a1815]">Rice n Spice</p>
                <p className="text-xs text-[#8a8680]">Block 7, Clifton, Karachi</p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#ebe9e4] p-6 sm:p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1a1815]">Message Sent!</h3>
                    <p className="text-sm text-[#8a8680] mt-1 max-w-sm">
                      Thanks for reaching out. Our team will get back to you within 24 hours.
                    </p>
                  </div>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", subject: "General Enquiry", message: "" }); }}
                    className="text-sm font-semibold text-[#e8570e] hover:text-[#c44a0c] transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-[#1a1815] mb-1">Send Us a Message</h2>
                  <p className="text-sm text-[#8a8680] mb-6">We usually respond within a few hours.</p>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Full Name" required>
                        <input
                          type="text" placeholder="Ahmed Raza" required value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 transition-all placeholder:text-[#c4c0ba] text-[#1a1815]"
                        />
                      </Field>
                      <Field label="Email Address" required>
                        <input
                          type="email" placeholder="ahmed@example.com" required value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 transition-all placeholder:text-[#c4c0ba] text-[#1a1815]"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Phone (optional)">
                        <input
                          type="tel" placeholder="+92 300 0000000" value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 transition-all placeholder:text-[#c4c0ba] text-[#1a1815]"
                        />
                      </Field>
                      <Field label="Subject">
                        <select
                          value={form.subject}
                          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 transition-all text-[#1a1815]"
                        >
                          {["General Enquiry", "Table Reservation", "Catering / Events", "Feedback", "Complaint", "Other"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="Message" required>
                      <textarea
                        rows={5} placeholder="How can we help you?" required value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 transition-all placeholder:text-[#c4c0ba] text-[#1a1815] resize-none"
                      />
                    </Field>

                    <button
                      type="submit"
                      className="bg-[#e8570e] hover:bg-[#c44a0c] text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 w-full sm:w-auto"
                    >
                      Send Message
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#1a1815]">
        {label}
        {required && <span className="text-[#e8570e] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}