import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AssessmentCard(props: { name: string; description: string; count: string; last?: string; severity?: string; action: string; onStart: () => void }) {
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-lg font-bold">{props.name}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{props.description}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
        <span>{props.count}</span>
        {props.last ? <span>{props.last}</span> : null}
        {props.severity ? <span>{props.severity}</span> : null}
      </div>
      <Button type="button" onClick={props.onStart} className="w-full">{props.action}</Button>
    </Card>
  );
}
