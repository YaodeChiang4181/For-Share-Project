import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ClientPostViewer from "@/components/ClientPostViewer";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  // Next.js 15 requires awaiting params
  const resolvedParams = await params;
  const postId = resolvedParams.id;

  let post: any = null;
  let totalTips = 0;
  let tipCount = 0;

  try {
    post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { name: true, image: true },
        },
      },
    });

    if (!post) {
      notFound();
    }

    // 取得迴響統計
    const stats = await prisma.transactionRecord.aggregate({
      where: { relatedPostId: postId, type: "EARN_TIP" },
      _sum: { amount: true },
      _count: { id: true },
    });

    totalTips = stats._sum.amount || 0;
    tipCount = stats._count.id || 0;
  } catch (error: any) {
    // If post not found it will already have thrown notFound()
    // For other errors, show an error message
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="bg-error/10 border border-error text-error p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-2">資料載入失敗 (Server Error)</h2>
            <p className="font-mono text-sm whitespace-pre-wrap">{error.message || String(error)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    notFound();
  }

  // 將資料轉交給 Client Component 進行處理與攔截
  return (
    <ClientPostViewer 
      post={post} 
      currentUserId={session?.user?.id} 
      totalTips={totalTips}
      tipCount={tipCount}
    />
  );
}
