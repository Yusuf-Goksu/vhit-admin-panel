import PatientDetailPage from "@/features/patients/components/PatientDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <PatientDetailPage patientId={id} />;
}
