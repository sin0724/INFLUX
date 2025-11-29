import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';

// POST: 체험단 신청 생성
async function createExperienceApplication(req: NextRequest, user: any) {
  try {
    if (user.role !== 'client') {
      return NextResponse.json(
        { error: '광고주만 체험단 신청이 가능합니다.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      companyName,
      place,
      reservationPhone,
      desiredParticipants,
      providedDetails,
      keywords,
      blogMissionRequired,
      additionalNotes,
    } = body;

    // 필수 필드 검증
    if (!companyName || !place || !reservationPhone || !desiredParticipants || !providedDetails || !keywords) {
      return NextResponse.json(
        { error: '필수 필드를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 희망모집인원 숫자 검증
    const participants = parseInt(String(desiredParticipants), 10);
    if (isNaN(participants) || participants < 1) {
      return NextResponse.json(
        { error: '희망모집인원은 1 이상의 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('experience_applications')
      .insert({
        clientId: user.id,
        clientUsername: user.username,
        companyName: companyName.trim(),
        place: place.trim(),
        reservationPhone: reservationPhone.trim(),
        desiredParticipants: participants,
        providedDetails: providedDetails.trim(),
        keywords: keywords.trim(),
        blogMissionRequired: blogMissionRequired === true || blogMissionRequired === 'true' || blogMissionRequired === '예',
        additionalNotes: additionalNotes?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Create experience application error:', error);
      return NextResponse.json(
        { error: '체험단 신청에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      application: data 
    });
  } catch (error) {
    console.error('Create experience application error:', error);
    return NextResponse.json(
      { error: '체험단 신청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 체험단 신청 목록 조회 (관리자만)
async function getExperienceApplications(req: NextRequest, user: any) {
  try {
    // 관리자만 조회 가능
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('experience_applications')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Get experience applications error:', error);
      return NextResponse.json(
        { error: '체험단 신청 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ applications: data || [] });
  } catch (error) {
    console.error('Get experience applications error:', error);
    return NextResponse.json(
      { error: '체험단 신청 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return withAuth((r, u) => createExperienceApplication(r, u), ['client'])(req);
}

export async function GET(req: NextRequest) {
  return withAuth((r, u) => getExperienceApplications(r, u), ['admin', 'superadmin'])(req);
}

