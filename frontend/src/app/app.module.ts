import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { AppComponent } from './app.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';

@NgModule({
  declarations: [AppComponent, UnauthorizedComponent],
  imports: [BrowserModule, AppRoutingModule, CoreModule, SharedModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
