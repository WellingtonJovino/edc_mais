import { NextRequest, NextResponse } from 'next/server';
import { getLearningPlans } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const plans = await getLearningPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}