import { combineServices } from '@aomex/common';
import { CacheService } from './cache.service';
import { UserService } from '@services/user.service';
import { AuthService } from '@services/auth.service';
import { TutorialService } from '@services/tutorial.service';
import { MemberService } from '@services/member.service';
import { OrderService } from '@services/order.service';
import { PaymentService } from '@services/payment.service';
import { EBookService } from '@services/ebook.service';
import { ArticleTutorialService } from '@services/article-tutorial.service';
import { VideoTutorialService } from '@services/video-tutorial.service';
import { CalendarService } from '@services/calendar.service';

export const services = await combineServices({
  cache: CacheService,
  user: UserService,
  auth: AuthService,
  tutorial: TutorialService,
  member: MemberService,
  order: OrderService,
  payment: PaymentService,
  ebook: EBookService,
  article: ArticleTutorialService,
  video: VideoTutorialService,
  calendar: CalendarService
});

declare module '@aomex/common' {
  type T = typeof services;
  export interface CombinedServices extends T {}
}
