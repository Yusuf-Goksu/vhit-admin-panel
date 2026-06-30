import ClinicDetailPage from "@/features/clinics/components/ClinicDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ClinicDetailPage clinicId={id} />;
}
