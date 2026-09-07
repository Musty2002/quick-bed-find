import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  adjustBeds,
  checkInReservation,
  listHospitalRequests,
  lookupReservation,
  myHospitals,
  setRequestStatus,
} from "@/lib/beds.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Hospital Staff Desk — CritiCare Beds" },
      {
        name: "description",
        content:
          "Hospital staff desk: approve bed requests for your hospital, scan patient QR passes and keep ICU bed counts current.",
      },
      { property: "og:title", content: "Hospital Staff Desk — CritiCare Beds" },
      {
        property: "og:description",
        content: "Approve requests, scan patient passes and keep bed counts current for your hospital.",
      },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const queryClient = useQueryClient();
  const fetchMyHospitals = useServerFn(myHospitals);
  const fetchRequests = useServerFn(listHospitalRequests);
  const runStatus = useServerFn(setRequestStatus);
  const runAdjust = useServerFn(adjustBeds);
  const runLookup = useServerFn(lookupReservation);
  const runCheckIn = useServerFn(checkInReservation);

  const hospitalsQuery = useQuery({
    queryKey: ["my-hospitals"],
    queryFn: () => fetchMyHospitals(),
    retry: false,
  });
  const hospitals = (hospitalsQuery.data ?? []) as any[];

  const [hospitalId, setHospitalId] = useState<string | null>(null);
  useEffect(() => {
    if (!hospitalId && hospitals.length === 1) setHospitalId(hospitals[0].id);
  }, [hospitals, hospitalId]);

  const requestsQuery = useQuery({
    queryKey: ["hospital-requests", hospitalId],
    queryFn: () => fetchRequests({ data: { hospitalId: hospitalId! } }),
    enabled: !!hospitalId,
    retry: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel("staff-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bed_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["hospital-requests"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hospitals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-hospitals"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState<any | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }
  useEffect(() => stopCamera, []);

  async function lookup(raw: string) {
    if (!hospitalId) return;
    try {
      const row = await runLookup({ data: { hospitalId, code: raw } });
      setScanned(row);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reservation not found");
    }
  }

  async function startScan() {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      toast.error("This browser can't use the camera scanner — type the code instead");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const detector = new Detector({ formats: ["qr_code"] });
      requestAnimationFrame(async function tick() {
        const video = videoRef.current;
        if (!streamRef.current || !video) return;
        if (video.srcObject !== stream) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        try {
          const codes = await detector.detect(video);
          if (codes?.[0]?.rawValue) {
            stopCamera();
            await lookup(codes[0].rawValue);
            return;
          }
        } catch {
          /* keep scanning */
        }
        requestAnimationFrame(tick);
      });
    } catch {
      toast.error("Camera permission denied");
      stopCamera();
    }
  }

  async function handleStatus(id: string, status: "Approved" | "Declined") {
    try {
      await runStatus({ data: { id, status } });
      queryClient.invalidateQueries({ queryKey: ["hospital-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-hospitals"] });
      toast.success(`Request ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function handleAdjust(delta: number) {
    if (!hospitalId) return;
    try {
      await runAdjust({ data: { hospitalId, delta } });
      queryClient.invalidateQueries({ queryKey: ["my-hospitals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function handleCheckIn(id: string) {
    try {
      await runCheckIn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["hospital-requests"] });
      toast.success("Patient checked in");
      setScanned({ ...scanned, checked_in_at: new Date().toISOString() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (hospitalsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">Loading…</main>
      </div>
    );
  }

  if (hospitals.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>No hospital assigned yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your account isn't linked to a hospital. Ask your administrator to add you to a
              hospital, then reload this page.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!hospitalId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
          <h1 className="text-2xl font-semibold text-foreground">Choose your hospital</h1>
          {hospitals.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium text-foreground">{h.name}</p>
                  <p className="text-sm text-muted-foreground">{h.city}</p>
                </div>
                <Button size="sm" onClick={() => setHospitalId(h.id)}>
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </main>
      </div>
    );
  }

  const hospital = hospitals.find((h) => h.id === hospitalId);
  const requests = (requestsQuery.data ?? []) as any[];
  const pending = requests.filter((r) => r.status === "Pending");
  const records = requests.filter((r) => r.status !== "Pending");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{hospital?.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{hospital?.city} · staff desk</p>
          </div>
          {hospitals.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setHospitalId(null)}>
              Switch hospital
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ICU beds</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => handleAdjust(-1)}>
              −
            </Button>
            <span className="text-sm text-foreground">
              {hospital?.icu_free}/{hospital?.icu_total} free
            </span>
            <Button size="sm" variant="outline" onClick={() => handleAdjust(1)}>
              +
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan patient pass</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Reservation code e.g. 4F9A2C1B"
                className="max-w-56"
                onKeyDown={(e) => {
                  if (e.key === "Enter") lookup(code);
                }}
              />
              <Button onClick={() => lookup(code)}>Look up</Button>
              {scanning ? (
                <Button variant="outline" onClick={stopCamera}>
                  Stop camera
                </Button>
              ) : (
                <Button variant="outline" onClick={startScan}>
                  Scan with camera
                </Button>
              )}
            </div>
            {scanning && (
              <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-md border border-border" />
            )}
            {scanned && (
              <div className="space-y-1 rounded-md border border-border p-3 text-sm">
                <p className="font-medium text-foreground">
                  {scanned.patient_name} · {scanned.severity}
                </p>
                <p className="text-muted-foreground">Condition: {scanned.condition}</p>
                <p className="text-muted-foreground">
                  Age: {scanned.patient_age ?? "—"} · Phone: {scanned.patient_phone ?? "—"}
                </p>
                <p className="text-muted-foreground">Status: {scanned.status}</p>
                <div className="pt-2">
                  {scanned.checked_in_at ? (
                    <Badge variant="outline">
                      Checked in {new Date(scanned.checked_in_at).toLocaleString()}
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleCheckIn(scanned.id)}>
                      Check patient in
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incoming requests ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">
                    {r.patient_name} <span className="text-muted-foreground">· {r.condition}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} · code {r.reservation_code}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{r.severity}</Badge>
                  <Button size="sm" onClick={() => handleStatus(r.id, "Approved")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, "Declined")}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient records ({records.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {records.length === 0 && <p className="text-sm text-muted-foreground">No records yet.</p>}
            {records.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">
                  {new Date(r.created_at).toLocaleDateString()} · {r.patient_name} · {r.condition}
                  {r.patient_phone ? ` · ${r.patient_phone}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {r.checked_in_at && <Badge variant="outline">Checked in</Badge>}
                  <Badge variant={r.status === "Approved" ? "default" : "destructive"}>{r.status}</Badge>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
